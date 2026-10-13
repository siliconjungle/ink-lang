# Maintained folds and state performance — 2026-10-13

Ink now admits constant-work U64/Bool group folds on source tables, provides map and bounded dense-prefix storage, derives lean single-cell and owned-result entrypoints, and compiles state subscriptions, batching and host transactions. The installed producer authors filtered U64 sums/counts and weighted contributions across independent tables. This report measures state only; there are no DOM/framework throughput claims.

## Did integration cause a severe regression?

No broad severe regression is supported by the matched A/B runs. Both artifact sets ran in each fresh process, with the same 4,096-row inputs, portable seed, 20,000 small-state warmup calls per lane, seven retained rounds and alternating lane order. The comparison includes three fresh processes. The table uses the median of within-process after/before ratios.

| Implementation | Median paired change | Process changes |
|---|---:|---|
| Ink baseline | -10.9% | -14.5%, -10.9%, -8.9% |
| Ink maintained map | +8.8% | -18.0%, +23.3%, +8.8% |
| Ink dense prefix | -1.0% | +14.9%, -1.0%, -8.8% |
| Ink checked tree | +3.2% | +15.5%, +3.2%, -15.6% |

Map has a modest positive median change, with mixed signs; these observations do not establish statistical significance or its cause. Dense and tree changes also have mixed signs. The scanning baseline improved consistently. Initial quieter runs showed 0.78 µs dense and 1.11 µs map; later cross-run medians were 2.42 µs and 1.84 µs while every external control also slowed. Those absolute differences cannot establish a code regression.

In the two quieter matched A/B processes, current dense measured 0.97–1.04 µs, map 1.15–1.39 µs and tree 2.82–3.27 µs. Manual Preact measured 0.33–0.38 µs raw and 0.37–0.42 µs with this action’s commit/version/event contract. Ink still trails that manual control. The manual contract control does not implement general transactions or portable restore.

`summary.json` and `process-*.json` retain the earlier multi-size run. Its first 256-row case also paid for evolving V8 optimisation, so the 256→4,096-row decrease is not a storage-scaling result. `matched-ab/` corrects the warmup issue for the integration comparison and retains both actual artifact sets. Timing variation was substantial on the shared host; no confidence interval or isolated-machine claim is made.

## Proofs and correctness

The filtered packet has 307 canonical objects, including 254 theorems, for two views. The ledger packet has 353 objects and 272 theorems for three views on two independent tables. These are complete proof closures, including reused generic word laws, rather than counts of newly invented theorems. Eight universal obligations are regenerated per view: source factorisation, identity, associativity, commutativity, cancellation, insertion, deletion and replacement. Word arithmetic includes wrapping over all 64 bits. Both source-bound capabilities and their recipe are published in the canonical knowledge database.

Validation passed: 735 variant/history outcome and exact snapshot comparisons against the independent source evaluator; forged-proof/source/layout rejection; staged reads, deletion, nested abort, rollback, full-width keys, wrapping, corrupt restore, commit exhaustion and subscription behavior. Eight signals-state tests, six affected core tests, the complete JavaScript lowering suite, 149 planner tests and 22 affected knowledge/index tests passed. The source controller also passed C/Rust/JS, both Wasm ABIs and an actual eligible GPU dispatch; this does not mean maintained folds execute on the GPU. Independently pinned remote compiler/runtime dependencies compile without the distribution’s path patches.

The native cell/fold controller, codecs and backend are trusted implementations. The group/factorisation proofs do not establish whole-compiler correctness. Current maintained/dense emission is JavaScript only, and other targets reject it explicitly. The installed producer currently requires U64 keys/groups; other supported group/codecs require their own proof authoring.

## Offline lifecycle selection

The current bounded search admitted baseline, maintained map and dense-prefix candidates. It selected the 256-slot dense prefix. Fresh acquisition includes module load, initialise/setup, complete successful and failing histories, checkpoint, restore and whole-host peak RSS. Every candidate must match independent source outcomes, versions, ordered events, exact portable snapshots and input ownership before and after timing. Three fresh processes measure each candidate.

The winner passed an independent held-out history. The weighted training baseline was 105.68 ms versus 38.04 ms for the selected candidate; held-out baseline was 114.40 ms versus 38.44 ms. These are weighted lifecycle objectives, not single-action latency. The existing empirical extrema guard, rather than median alone, selected the winner.

A second focused installed-recipe run admitted four states (baseline, map, dense 256 and dense 4,096), also selected dense 256 and passed its independent holdout. See `storage-selection-summary.json`.

The broader search rejected an outdated published bit proof and another published attempt hit its checker time limit. This is a bounded search, not an exhaustive search of every layout or proof. See `planner-summary.json` and the compressed selected packet/receipt for complete provenance and limits.

## Reproduction and provenance

Node {'@preact/signals-core': '1.14.4', 'svelte': '5.57.2'} on Apple M2; see `provenance.json`, source revision manifest and artifact hashes in every raw result. The controls use exact wrapping U64 arithmetic, identical update inputs and synchronous or awaited observation windows. Connected Ink uses two independently owned query subscriptions versus one batched signals effect, which is explicitly retained in the scope description.

Run `node --conditions=browser bench/signals-state/maintained-bench.mjs CONFIG.json` with the saved A/B configuration, restoring the referenced artifacts/dependencies locally. Raw configurations retain their original absolute paths. `benchmark-original.mjs` reproduces the earlier multi-size methodology; `matched-ab/benchmark.mjs` includes explicit shared-body warmup. Compressed `.mjs` and plan packets preserve the exact emitted bodies and proofs.

See [the capability contract](../../docs/maintained-folds.md) for source/host semantics and the public schema-2 lifecycle workload example in `planner/README.md`.

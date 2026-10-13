# Probabilistic planning and exact-result accelerators — 2026-10-12

Historical measurements below describe the recorded October 12 revisions. The
learned search ranking model, trainer and model flag were subsequently removed
after the complete-planning comparison showed a loss. Current deterministic and
stochastic search commands are in the benchmark README.

All new machinery is opt-in. Proposals, embeddings and measurements have no proof authority. The independent compiler checks source-bound selections. No automatic runtime profile is installed and no online profitability probes are added.

Apple M2, Chrome 154.0.8037.98, hardware Apple/Metal WebGPU; Python 3.12.3, Node 26.1.0, Zig 0.15.2. Shared-host observations are exploratory. Raw samples, losses, setup and source/emission identities are retained.

## Complete planning cost

Seven alternating repetitions; a heldout 17-term word expression plus a constant, trained on a separate 13-term source. Every output package was individually checked. The 64-candidate-proof budget excludes unchanged admission and final replay. The pinned base catalogue has 42 objects; typed discovery loads 18 law objects, and ordinary producers also propose derived laws. Structural selected cost is not execution speed.

| Approach | Median ms | Range ms | Selected cost |
| --- | --- | --- | --- |
| baseline | 471.97 | 456.11–574.82 | 77 |
| stochastic | 384.69 | 380.75–601.47 | 77 |
| learned | 1280.74 | 752.09–1530.93 | 77 |
| parallel | 1080.01 | 924.93–1420.00 | 77 |
| accelerated-discovery | 460.61 | 433.91–517.28 | 77 |
| hnsw | 532.97 | 471.73–728.60 | 77 |

Initial cost was 79; every approach selected 77. Learned ranking and two-worker search lose on this fixture. HNSW adds work at this catalogue size. Stochastic search has a lower overall median but inconsistent training timings; the adaptive holdout policy consequently retains ordinary search. Earlier acceptance-only ranking and a run overlapping validation remain under `initial-planning`, excluded from final tables.

## Adaptive search

The wrapper matches saved observations to catalogue size, source-node count, budgets, exact source/catalogue pins, target, Python and compiler/planner/producer identity. Unobserved sizes and stale contexts fall back. A candidate needs >10% training and every heldout complete-call gain, with equal or better checked structural cost. Existing child timings charge per-call index construction. Wrapper overhead is separately measured.

| Complete wrapper call | Median ms | Chosen strategy |
| --- | --- | --- |
| ordinary | 566.94 | baseline |
| adaptive | 577.85 | baseline |

Fourteen calls use new seeds 831..837; all packages rechecked and all budgets respected. The current saved evidence selects baseline. This demonstrates fallback, not an adaptive speed win. Unit checks also exercise different observed catalogue sizes selecting different approaches and rejecting quality loss.

## Compiled Ink kernels

Complete captured input and owned result timings include row-ID creation, upload, dispatch, synchronization and readback. Input generation and independent output validation are outside timing. Two warmups precede seven alternating repetitions. Plain JS is a direct imperative control. The kernels are fixed-point word scoring and a bounded 256-instruction one-register candidate evaluator; Python still coordinates search and the proof checker remains independent.

| Kernel | Rows | GPU ms | Wasm ms | Ink JS ms | Plain JS ms |
| --- | --- | --- | --- | --- | --- |
| score | 4096 | 1.4250 | 0.3125 | 0.1875 | 0.0500 |
| score | 65536 | 6.5500 | 4.5000 | 2.8500 | 0.8500 |
| score | 1048576 | 88.6000 | 71.2000 | 41.6000 | 12.9000 |
| evaluate | 4096 | 1.0375 | 1.7625 | 2.5500 | 1.4250 |
| evaluate | 65536 | 4.6500 | 28.9500 | 41.8000 | 23.5500 |
| evaluate | 1048576 | 65.1000 | 459.5000 | 663.2000 | 371.5000 |

At one million rows, GPU candidate evaluation is about 5.7× faster than Plain JS and 7.1× faster than Wasm; cheap scoring loses to CPU. These are kernel results, not complete planning or transactional-update gains. The loopback bridge has three separately retained whole-planner probes in `bridge.json` (about 864–1177 ms), with no paired speed claim.

First-use measurements create fresh engines in one page with shared module/browser/driver caches. At 65536 rows, median GPU score/evaluate first use is 13.0/10.8 ms, but the first GPU score call took 804.8 ms. All 24 first-use samples are retained; these are not cold-machine measurements.

## Does synthesis improve deployed software?

A stochastic/affine proposal replaced thirteen additions with multiplication by thirteen, after a universal ordinary word-ring proof. Small calls are batched 64/8/1 times at the three sizes to avoid zero timer samples. Both versions run through the same generated host boundary.

| Rows | Backend | Before ms | After ms | Before/after |
| --- | --- | --- | --- | --- |
| 4096 | javascript | 0.009375 | 0.006250 | 1.500× |
| 4096 | cpu | 0.132812 | 0.134375 | 0.988× |
| 65536 | javascript | 0.100000 | 0.087500 | 1.143× |
| 65536 | cpu | 2.037500 | 2.050000 | 0.994× |
| 1048576 | javascript | 1.900000 | 1.500000 | 1.267× |
| 1048576 | cpu | 33.600000 | 33.900000 | 0.991× |

The JavaScript fixture improves; the Wasm fixture does not. This narrow word example does not demonstrate general synthesis benefits. The first unbatched deployment run had insufficient timer resolution and remains under `initial-unbatched`.

## Exact discovery and learned positions

Mixed typed, impossible-operation and paged queries are compared against canonical SQLite results, with 192 queries per repetition. Canonical publication/SQLite construction is a common prerequisite; accelerator setup is additional and is never reduced by subtracting that common cost.

| Entries | SQLite µs/query | Accelerated µs/query | Warm gain | Extra setup ms | Common publish/SQL ms | Setup break-even queries |
| --- | --- | --- | --- | --- | --- | --- |
| 2048 | 667.03 | 65.84 | 10.13× | 483.72 | 1370.75 | 805 |
| 8192 | 3325.47 | 331.87 | 10.02× | 1431.75 | 5302.10 | 478 |

Warm discovery is about 10× faster, with substantial canonical authentication/setup costs. The Bloom/exact bucket index supplies most benefit here. The isolated learned integer lower bound loses to C bisect: about 0.89–0.95 µs versus 0.15–0.20 µs, despite exact results and guarded fallback. It remains optional.

## HNSW scaling and recall

These are synthetic independent normalized 64-number vectors, not learned semantic law embeddings. Exact scans include top-k partition. HNSW uses M=16, construction effort=100, seed=173 and one CPU thread. Each row summarizes seven passes of 128 queries. The actual Ink hint path uses a deterministic 64-dimensional structural sketch of typed operation counts, node count and depth; full exact candidate enumeration and proof checking remain.

| Vectors | Query effort | µs/query | Gain vs exact | Recall@16 | Graph build ms | Saved index MB |
| --- | --- | --- | --- | --- | --- | --- |
| 2048 | hnsw | 51.36 | 1.78× | 95.95% | 135.18 | 0.83 |
| 8192 | hnsw | 64.28 | 7.30× | 83.45% | 808.70 | 3.32 |
| 100000 | hnsw-1024 | 2049.40 | 3.03× | 98.19% | 22618.37 | 40.47 |
| 100000 | hnsw-256 | 514.85 | 12.06× | 79.93% | 22618.37 | 40.47 |
| 100000 | hnsw-64 | 169.43 | 36.63× | 45.02% | 22618.37 | 40.47 |

Scaling can help retrieval, but fast low-recall settings miss promising options. Graph construction and memory must be amortized; nearest structural shapes do not establish applicability or equivalence. No million-vector or complete-large-catalogue planner speed claim is made. [HNSW paper](https://arxiv.org/abs/1603.09320), [library parameters](https://github.com/nmslib/hnswlib/blob/master/ALGO_PARAMS.md).

## Offline tuning and verification

The tuner replays measured alternatives using rounds 0..3 for training and 4..6 for holdout. It charges an explicitly derived first-use estimate from the 65536-row shared-page runs to all sizes, at 256 expected calls. Three evaluator cohorts pass the offline GPU gate; all scoring cohorts retain JavaScript. Receipts remain untrusted profitability evidence and install no target profile. This small three-alternative experiment exercises admission gates; it does not demonstrate Bayesian search efficiency in a large configuration space.

Validation: 70 planner unit tests; 19 store tests plus 4 exact-accelerator/artifact tests; actual compiler synthesis and source-bound proof replay; authenticated false theorem rejected; independent worker total budget and final replay; unavailable loopback scorer retains a checked result. GPU has 168 warm samples, 48 corner comparisons, 24 first-use samples and 84 before/after deployment samples. Every timed word is checked, and nonempty GPU work requires actual hardware dispatch/readback without fallback. Existing historical knowledge failures from the earlier state work remain documented; no full historical-suite pass is claimed.

`artifact-hashes.json` authenticates frozen source, models, canonical stores, packages and emitted browser/Wasm/WGSL modules. `measured-artifacts.tar.gz` excludes dependencies, caches and unused native projects. `validation.json` records verification, compiler identity and exact child revisions. Conformance is not a backend proof.

Reproduction: [commands](../../bench/probabilistic-planner/README.md), [architecture and trust](../../docs/probabilistic-planning.md). Raw data: `planning.json`, `adaptive.json`, `gpu.json`, `autotune.json`, `neighbourhood.json`, `neighbourhood-large.json`, `bridge.json`. The separate Svelte/Preact GPU comparison remains in the sibling GPU report.

## Integration with current main

`merge-validation.json` records conformance after preserving main’s full catalogue,
layered planning, typed memo search and explicit physical strategies. It rechecks
79 planner tests, 35 focused knowledge tests, 15 JavaScript package tests, state
and composed-plan histories, required C/Rust/JS/both-Wasm parity and actual fresh
hardware GPU kernels. Ownership tests now author and check the explicit physical
borrow plan and retain the ordinary baseline and all prior mechanism/semantic
assertions. Historical timing tables above continue to describe their frozen
measured revisions; integration validation does not establish new timings.

# Exact staging of learned computations

The checked frozen producer now turns completely known binary32 calculations
and helper invocations into constants. The learned 32-instruction example keeps
its weights, inputs, target workload and optimizer state live; its instruction
counter becomes the exact binary32 value `24.0` in the loss query. Dynamic
arithmetic retains its original order. This remains an explicit proposal, not
an automatically profitable planner selection.

Feature source: `67aa3a2ec42149c400ee52d5e1d7ed8b8384a317`.
Knowledge: `d9e7a809be94cbab48887edc302e21e5b79f070d`.
The later distribution merge preserves the independently developed device
calibration work and planner `757984c7fa01dd9c932cc8573c2457c9d5396061`.

## What changed

The untrusted closed-scalar author uses exact integer arithmetic for binary32
arithmetic, comparison, classification, rounding, square root and integer
conversion. Kernel conversion independently checks every proposed answer. Scalar
IEEE equality stays distinct from composite-value equality. No dynamic identity,
floating-point reassociation or relaxed error contract is introduced.

A long closed fold is connected to its balanced helper by universal prefix
laws, followed by conversion of that closed helper invocation. Helpers remain
ordinary mathematical witnesses when their executable calls disappear. A
bounded auxiliary pure-query projection exposes these definitions for authoring;
its queries never enter the selected source. Short conversions keep the existing
checker limits. Fixed, unused and reordered captures remain explicit, and the
accumulator never aliases a captured formal merely because their values agree.

The producer also proposes immutable literal maps and keeps already literal
initializers behind existing function boundaries when no call argument becomes
newly known. This reduces irrelevant expansion. Failed closed-map attempts
restore speculative authoring state; complete action proofs still establish
errors, evaluation order, events and rollback.

Trained artifacts store one complete package in `selection.json`. A fixed local
reference in the generated descriptor binds those exact checked bytes. Verification
replays the package before checking that binding; alternate paths, extra reference
fields, wrong evidence and ambiguous embedded packages reject. Hashes do not
replace proof checking.

## Node 25 measurements

Apple M4 Pro, macOS arm64, Node **25.3.0**. Six alternating-order pairs, with one
artifact and one workload per fresh VM. Each worker performs one complete warmup
block and five measured blocks: 250,000 requests per serving block and 50,000 per
loss block. Requests use complete typed bound calls. Weight/goal changes and event
acknowledgement are included where stated. Construction, import, state creation,
first call and warmup remain outside the request timings and are recorded
separately. Loss starts with seven rows; the goal-reset workload uses two rows.

The control below is the unspecialized frozen program. Latency columns are
medians of per-process sample medians. The speedup is the geometric mean of all
six paired ratios; it need not equal the ratio of the two displayed medians.

| Request | Control ns | New ns | Geometric paired speedup |
| --- | ---: | ---: | ---: |
| Serve | 237.91 | 172.57 | 1.372× |
| Serve, weight update every 16 requests | 264.46 | 195.52 | 1.047× |
| Loss over seven rows | 1,324.28 | 812.22 | 1.630× |
| Loss, goal reset every 64 requests | 680.07 | 341.56 | 1.986× |

The weight-update series includes one adverse paired ratio of **0.292×**, retained
without filtering. The other five ratios lie near 1.35×; this explains the much
smaller geometric gain despite the displayed medians. All raw samples and ratio
ranges are in `summary.json` and `measurements/`.

A direct comparison against the **previous specialized layout**, under this same
isolated Node 25 protocol, separates the new layout from benchmark-protocol changes:

| Request | Control ns | New ns | Geometric paired speedup |
| --- | ---: | ---: | ---: |
| Serve | 171.18 | 173.29 | 0.990× |
| Serve, weight update every 16 requests | 197.59 | 197.80 | 1.003× |
| Loss over seven rows | 1,261.82 | 807.72 | 1.549× |
| Loss, goal reset every 64 requests | 753.46 | 342.40 | 2.206× |

Serving is approximately unchanged against that layout; the loss and goal-reset
workloads improve consistently in these six pairs. This comparison combines
closed calculation and inlining-policy changes; it is not a single-mechanism
ablation. Both controls receive the same complete request histories; checksum
vectors and final checkpoint digests agree. Reply-by-reply and exact snapshot-byte
comparisons are separate conformance checks.

## Earlier runs and engine variation

All 54 paired records are retained. Initial shared-VM runs and longer shared-VM
runs had large execution-order effects and losses. They are diagnostics, not
substitutes for the isolated protocol. The earlier publication's 17% goal-reset
regression used a different warmup/protocol; do not read the new headline as a
controlled comparison against that historical number.

The report also retains isolated Node **22.22.1** runs. Their goal-reset ratios
range from approximately **0.80× to 3.59×** against the baseline, and several
other cases show large outliers. The stable Node 25 loss results do not establish
universal engine behavior. No sample is removed and no runtime controller is
allowed to select this proposal on the strength of these report statistics alone.

## Artifact size

| Inventory | Unspecialized | Previous specialized | New specialized |
| --- | ---: | ---: | ---: |
| All artifact files | 1,304,706 B | 9,158,410 B | 2,956,758 B |
| JavaScript source | 807,307 B | 831,143 B | 826,335 B |
| Proof package | — | 3,937,330 B | 1,680,149 B |
| Generated descriptor | 139,895 B | 3,938,155 B | 992 B |

The new full inventory is about 68% smaller than the previous specialization.
These are uncompressed artifact-file inventories, including proofs. They are
not runtime heap or a measured browser-download boundary. The new inventory
still exceeds the unspecialized baseline. The three archives retain complete
independently verifiable artifacts, including the losing control.

## Validation and trust boundary

- 25 frozen-producer tests and two scalar-author tests pass. The scalar suite
  checks **7,707** independently proposed calculations against the real kernel,
  including IEEE boundaries, seeded values and a rehashed false answer.
- 13 frozen-state, six policy-learning and seven trained-build tests pass with
  Wasm enabled. The separately required native GPU test also passes; it was
  explicitly enabled after the ordinary suite's optional GPU test returned.
- Rehashed descriptor attacks cover wrong hash/path/schema/semantics, extra
  fields, missing references, ambiguous packages and wrong selection evidence.
  Old embedded packages remain checked. Rehashed false action/extension/rewrite
  proofs still fail in the ordinary proof checker before reference matching.
- The complete hardening suite passes **43 tests**.
- Current browser fixtures pass **99 comparisons**, with exact snapshots and
  **12 actual GPU calls**. An earlier stale-bundle failure is a diagnostic;
  the final fixtures were regenerated with the current producer before testing.
- A private checkout and private Cargo target built committed source `67aa3a2e`
  and reproduced **22** exact images, including the generated descriptors.
  Deterministic training and restriction replay passed. The unrelated working
  query-syntax edit is excluded from this source rebuild.
- Four initialized JavaScript images also match through the merged distribution
  using the copied clean compiler. The compiler digest and current planner pin
  are recorded in `merged-emission.json`.

These are finite implementation checks. They do not prove compiler correctness,
source-to-proof translation, all backend behavior, optimizer convergence, a
statistical error contract or upstream Handwired performance parity. Training
and state transitions still execute on CPU hosts; eligible pure roots account
for the separate GPU work.

## Frozen planning corpus

The full ten-program corpus is running against the copied clean committed
compiler and merged planner/catalogue. The producer remains explicitly requested;
this corpus measures the general catalogue funnel, not automatic discovery or
held-out speedups for the learned example. Publication awaits the terminal
corpus report and its exact source/compiler context.

## Reproduction

```sh
ink build-model examples/learned-program.ink examples/learned-program-training.json \
  --freeze-roots Structure --target javascript -o build/learned-baseline
ink build-model examples/learned-program.ink examples/learned-program-training.json \
  --freeze-roots Structure --specialize-frozen --target javascript \
  -o build/learned-selected
ink verify-model build/learned-selected --replay
node bench/learned-program/isolated-sample.mjs \
  build/learned-baseline build/learned-selected baseline,selected 10
python3 reports/closed-learned-computations-2026-10-17/audit.py --ink /absolute/path/to/ink
```

Alternate the ordering for subsequent pairs. `summarize.py` includes every
retained timing group without outlier removal. Raw workers record the runtime,
source images, complete checksum histories, checkpoint digests and startup costs.

General graph/tape specialization, learned representation selection with admitted
profitability evidence, parallel/device training, broader numeric proof domains
and the full Handwired/Pretext/Freerange performance and fidelity programme remain
required work.

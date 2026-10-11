# Ink proof library and web performance, batch 18

This batch adds 51 admitted proof objects implementing two reusable optimization mechanisms. The canonical catalogue grows from 1,247 to 1,298 entries; the historical snapshot is preserved. All optimizations are selected and checked at compile time. No runtime input checks, checker wrapper, runtime optimizer, compiler primitive, or backend change was added.

Measured gains reach all72 prior/current JS cells on both web hosts and49of72 native cells in each mode. Wasm gains are concentrated in sort removal. GPU adds eligibility but shows no confirmed same-backend speedup. Expert native Rust remains faster in most comparisons. The goal of broad native superiority remains open.

## Proof content

For U32, I32 and U64, an arbitrary pure total same-word mapper satisfies `sum(map(f, sort(xs))) = sum(map(f, xs))`. Modular addition makes the contribution total independent of list order. List induction and explicit insertion-preservation lemmas establish the equality. The associated count laws remove sorting before counting. Floating-point reassociation is excluded. These are general mapper laws, not a table of benchmark callback names.

For U32, I32, U64, F32 and Bool, a pure total callback satisfying the checked function equality `f(f(x)) = f(x)` can be repeated any positive number of times with the same result as one application. Function-valued natural-number induction, beta transport and exact `Use` premises establish the law. Separate checked callback lemmas prove lower clamp, upper clamp and keyed replacement idempotent for the four numeric types. Unconditional scalar instances bridge the source literals 8, 32 and 64 to the positive-count theorem; the property is discharged during compilation. Count zero is deliberately excluded.

The 51 objects comprise 11 generic optimization endpoints, 16 induction/transport/insertion dependencies, 12 callback-premise lemmas and 12 scalar literal instances. They represent two performance mechanisms. Typed count laws and Bool/F32 evidence are correctness coverage; performance measurements here use U32. The twelve workload recipes reuse four fresh selected root laws across primary and alternate callbacks.

Author evidence includes 21 permutation source applications, 147 frames and 294 interpreter runs; the idempotence lane includes 24 typed source applications, 378 frames and 612 interpreter runs. Five rehashed semantic false controls reject. A misplaced interpreter CLI flag and a lowercase Bool test-fixture type were corrected; initial failing receipts remain archived.

## Comparison protocol

The old 1,247-entry catalogue and the complete new union use identical CPU cost hypotheses. GPU planning uses its own frozen policy, also identical across catalogues. The checker, planner, compiler, backends and runtime retain all 102 guarded source hashes. All 48 compact selections replay; every CPU recipe changes through fresh proof selection. No timings informed proof authoring or policy revision.

There are six permutation score recipes and six fixed-point projection recipes, including alternate callback instantiations, lengths 32/4,096/65,536 and preset small/full word distributions. These alternates are not an external application corpus. Keyed inputs include a frozen sparse sentinel profile; clamp profiles exercise both branches. Full empty, singleton, unequal-list and full-width edge frames are checked separately.

Captured web calls include declared-list snapshots, Wasm transfer/result conversion, and actual GPU upload/dispatch/readback. Direct borrowed JS kernels are reported separately. Native comparisons use the same one-library driver with resident and declared-list snapshot modes. Rust controls use optimized native code or SIMD-enabled Rust-to-Wasm. Literal controls actually sort or repeat; strong expert controls already omit unnecessary work and may reuse output scratch. These distinctions are necessary to assess whether Ink matches expert output performance.

The first untimed build synthesized an unused second list argument for sort totals. Independent review found that this blocked the aggregate GPU backend. That preparation is preserved under `initial-preparation/`; before any timing, sort recipes were restored to their author's natural `xs, seed, k` interface, with symmetric one-list capture for all controls. Projection recipes retain their declared two-list interface. Callback expressions, data and cost policies were unchanged.

Untimed complete-output validation passes 1,872 web and 780 native comparisons. Two disjoint six-task browser contexts are frozen in advance. Timings run sequentially with nine shuffled rounds, one warmup, complete-output checksums and preserved calibration. Native adaptive calibration begins at one iteration, and every trial is retained.

## Results

The improvements are strongest in JS and sort-heavy workloads. Broad superiority over expert native implementations is **not established**. There is **no confirmed prior/current GPU speed gain** in this batch, despite additional GPU eligibility.

| Output / host | Faster than prior | Slower than prior | Inconclusive |
|---|---:|---:|---:|
| JS / Node | 72 / 72 | 0 | 0 |
| JS / browser | 72 / 72 | 0 | 0 |
| Wasm / Node | 37 / 72 | 1 | 34 |
| Wasm / browser | 37 / 72 | 0 | 35 |
| Native C / resident | 49 / 72 | 0 | 23 |
| Native C / snapshot | 49 / 72 | 2 | 21 |
| GPU / browser, eligible on both versions | 0 / 36 | 1 | 35 |

Sort removal also enables six GPU recipes that previously fell back to CPU. Those 36 new GPU cells are recorded as eligibility transitions; they are not counted as same-backend speedups. Across all twelve current GPU recipes, expert captured JS is faster in all 72 cells. Upload/dispatch/readback belongs to this comparison.

| Strong control comparison | Ink faster | Control faster | Inconclusive |
|---|---:|---:|---:|
| Captured JS / Node vs expert JS | 4 | 68 | 0 |
| Captured JS / browser vs expert JS | 4 | 58 | 10 |
| Ink Wasm / Node vs expert Rust-Wasm | 4 | 68 | 0 |
| Ink Wasm / browser vs expert Rust-Wasm | 4 | 64 | 4 |
| Native C resident vs expert Rust | 0 | 67 | 5 |
| Native C snapshot vs expert Rust | 2 | 66 | 4 |

Direct borrowed JS is a separate, correlated view: Node 4 Ink wins / 67 expert wins / 1 inconclusive; browser 12 / 53 / 7. It must not be pooled with captured-call results.

Supported-cell median prior/current gains range from 1.37–148.58× for Node JS, 1.25–127.38× for browser JS, 1.01–90.18× for Node Wasm, 1.01–69.72× for browser Wasm, 1.01–234.85× for resident native C and 1.02–155.59× for snapshot native C. These are ranges across supported cells, not suite averages or language-wide speedups. On full-width length65,536 sort recipes, browser descriptive medians are about 17–49× JS and 56–70× Wasm. Projection full-width JS medians are about 1.47–5.43×; Wasm/GPU remain near parity.

Four adverse prior/current intervals are preserved: Node Wasm lower-clamp alternate/small32; GPU upper-clamp alternate/small32; native snapshot lower-clamp alternate/full65,536 and upper-clamp alternate/small4,096. Their complete records are in `fresh-regressions.json`. No measured cost policy, dispatch rule or target selection was tuned to hide them.

The counts use exploratory individual paired bootstrap95% intervals over nine shuffled rounds, 4,000 resamples. All 2,304 archived intervals were independently recomputed exactly: 1,728 web intervals by the root audit and 576 native intervals by an agent. These intervals are unadjusted for multiple comparisons and related views are correlated. They support per-cell findings on this Apple M2 host, not an external application-corpus or universal language ranking.

The final run contains 7,776 Node, 9,072 browser and 6,480 native samples: **23,328** total. Validation including availability calls totals **6,936** complete comparisons. GPU evidence includes468 fixture requests (312 actual GPU paths, 156 CPU fallbacks),144 timed variant/cells and1,296 timed samples; all timed GPU cells have positive-length outputs and real dispatches. All1,326 frozen artifacts,48 compact packages and102 unchanged source hashes pass independent integrity review.

The canonical catalogue contains **1,298** proof objects and **11,106** observation records. This batch adds720 authenticated Wasm complete-call observations (360 per web host); JS/GPU/native results remain in the report artifacts with their distinct memory/transport scope. SQLite matches the canonical ledger and remains a disposable index.

Native one-iteration calibration initially reached a zero-duration assertion after30 finished group logs. That original log and all frozen helper bytes remain. A separately bound recovery uniformly restarted all144groups, allowed zero only in calibration and multiplied iterations by16 until measurable. Final measured/warmup durations are positive. Independent audit verifies3,051 calibration trials, including3 zero trials, and10,251 journaled rows. The aborted attempt's in-memory partial samples were unavailable and were not pooled. The separate GPU audit recovery handles scalar schema1's three counter keys versus vector schema2's additional live-buffer field;10 tampered counter variants reject. These recoveries change verification/calibration handling, not compiled algorithms, inputs or measured-round targets.

The environment is macOS26.5.2/Apple M2, Node26.1.0, Rust1.96.0/LLVM22.1.2 and Zig0.15.2. Native Ink here means its generated C compiled with Apple Clang14 at-O3; the independently written Rust controls use-O3/native CPU. This is not an Ink-to-Rust emitter measurement or a matched upstream-LLVM-version comparison. There is no independently authored WGSL expert control; the GPU comparison covers emitted prior/current paths and complete calls against expert JS.

## Generality and remaining work

Removing sorting changes avoidable O(n log n) work to an order-independent traversal. Removing repeated idempotent normalization avoids redundant callback applications. These transformations apply to arbitrary programs matching the proved pure-value shapes, across emitted JS/C/Wasm/WGSL where the target supports the resulting operations; unsupported GPU shapes still fall back. They do not establish a universal language ranking or guarantee profitability on every workload.

Five of six generated JS score reductions still materialize a mapped array before summing, while expert controls fuse the traversal. The primary distance total additionally composes with an existing fold law and emits an allocation-free traversal. Across twelve CPU bodies, visible allocation sites fall from17 to11; across GPU-policy C bodies they fall from18 to12. Vector outputs still require a full output traversal/allocation, and GPU transfers remain part of the complete call. The reference semantics uses insertion sorting; emitted C uses heap sorting. The semantic proofs certify IR equalities; backend/compiler correctness remains a separate trusted boundary exercised by complete-output comparisons.

This batch does not prove mutation effects, database transactions or general incremental state maintenance. The reusable equalities belong in the knowledge DB; execution-time observation records remain separate from mathematical authority. Changes and evidence are local, with no commit, push or PR.

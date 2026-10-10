# Ink web proof batch 17

83 locally checked entries grow the catalogue from 1,164 to **1,247**. The new arbitrary-callback laws remove collection stages and preserve ordered reduction semantics. They produce consistent JS and native improvements over prior Ink, but **do not establish broad superiority over expert JS, Rust or Rust-Wasm**. WebGPU gains eligibility for six vector recipes, yet complete GPU calls lose to expert JS in all 36 eligible input cells.

All changes are local. No commit, push or PR was made. No caller validation, checker wrapper or load-aware runtime optimizer was added.

## What was proved

The 83 entries are not 83 independent optimization mechanisms:

| Entries | Role |
|---|---|
| 12 zip endpoints | Three fusion families across U32/I32/U64/F32 |
| 12 fold endpoints | Four typed map-fold primitives plus eight composed map/concat-fold endpoints using existing ordered concat-fold laws |
| 12 Normalize equalities | Generic beta-transport support for the zip induction, without a separate performance transformation |
| 47 static certificates | 28 initial specializations plus 19 additional entries; the latter comprise 13 fresh sharing certificates and six old-only compositions supplied to both comparison stores |

The initial 28 include 18 work-saving specializations and ten beta/eta support identities. Five of the sharing producer's 18 new candidates were already among those 28, so they were not republished. Six old-only composition certificates are present symmetrically in the effective prior and current stores; their availability is not credited to the new generic laws.

Let `map`, `zipWith`, `++` and `foldr` have their usual pure list value semantics. Every callback below is arbitrary, pure and total, with its declared numeric type. The zip families are:

```
map g (zipWith h (map f xs) ys)
  = zipWith (lambda x y: g(h(f(x), y))) xs ys

map g (zipWith h xs (map r ys))
  = zipWith (lambda x y: g(h(x, r(y)))) xs ys

map g (zipWith h (map f xs) (map r ys))
  = zipWith (lambda x y: g(h(f(x), r(y)))) xs ys
```

They preserve pair order and produce exactly `min(len(xs), len(ys))` values. The proof inducts on `xs` at function type over `ys`, then uses nested list induction and ordinary congruence. The outer hypothesis remains independent of the inner induction variable. Checked Normalize support transports exact beta endpoints. Unequal lengths and both empty directions require no equal-length assumption.

The fold primitive is:

```
foldr q z (map f xs)
  = foldr (lambda x a: q(f(x), a)) z xs
```

Structural list induction proves it. The composed endpoints then use the existing ordered identity:

```
foldr q z (xs ++ ys) = foldr q (foldr q z ys) xs
```

For a mapped prefix, the outer fold uses `q(f(x), a)`; for two mapped lists, the suffix fold also uses its mapped reducer. The suffix runs in reverse before the prefix runs in reverse, with one continuing accumulator. No associativity, commutativity or independent-fold/combine assumption is made. F32 operations retain their original grouping; floating-point reassociation is not authorized.

Fusion changes eager callback scheduling and skips unused zip suffixes. These equalities do not describe effectful, partial or diverging callbacks. That is a semantic applicability condition established at compilation, not a runtime input check.

Static specialization is also checked. When substituting a nontrivial scalar value would repeat it, the producer retains `(lambda t: body(t))(value)`, represented by the existing typed `Let`. Fresh markers and capture-safe abstraction preserve binding. Unknown callbacks and partially applied function results retain their form. No task/law whitelist or trusted checker rule was introduced.

The author notes and exact evidence are retained in [fold](../../knowledge/research/web-stack-proofs-17/fold/NOTES.md), [zip](../../knowledge/research/web-stack-proofs-17/zip/NOTES.md) and [sharing](../../knowledge/research/web-stack-proofs-17/zip/sharing-probe/notes.md). Current snapshot: `717bc5be3b6d186678d71d3c11ec5a10a0bdc884759993f1d70add7a37b20c76`.

## Compiler and planner boundaries

The frozen compiler SHA256 is `45670dbced0999e945278d7de7ed495cad9b43b1ab9d24c27182c9f9a5683e08`. Of 102 guarded existing source files, 101 are unchanged. Only the external planner's `semantic_search.py` changed: optional known-lambda binding cost, optional structural list-cardinality estimates, and compact selected dependency-closure output. Both stores use identical models, frozen before usable timings. Filter cardinality is an estimate/upper bound, not a proved exact output length. No timed data tuned the models.

The first untimed full-union attempt failed its fresh-effect gate: beta substitution repeated an alternate mapper, and the old constant loop count inconsistently priced concat versus split folds. Those failures remain archived. The checked sharing pass and generic estimates corrected preparation; every current CPU task then selected fresh evidence and changed its prior body. Old-only compositions are compared fairly through effective prior snapshot `39494c38ba1db7d50357b29cec9e6c034f1fe48c63d39d3fe5e503716b1dd2d2`, with 1,170 entries.

All six current vectors emit one min-length loop and one output allocation. All six current folds eliminate intermediate collections. Staged/prior/current collection allocations are 32/28/6; JS loop sites are 42/38/16. Remaining overhead is real: the JS emitter retains 12 per-element IIFE sites for scalar sharing, and all six current scalar fold bridges allocate a one-word packed result. Four fold pairs changed from schema 1 to schema 2, so complete-call differences include that transport cost. Source shape alone does not prove faster execution.

## Frozen performance protocol

Twelve fresh U32 recipes cover independent left/right/both mapped zips and plain/prefix/concat arbitrary ordered folds, each with a primary and preset alternate callback. They run at 32, 4,096 and 65,536 elements with small and full-width values: **72 input cells and 156 correctness fixtures**. Both input arrays and four arguments use one common ABI, including the unused second array in a plain fold. Empty, mismatched-length, singleton, zero-factor and full-width edges are checked.

“Heldout” means a second preset callback, not an unseen external application corpus. Both gates are exercised in all 18 alternate vector profiles and all 18 primary-fold profiles. Alternate-fold small profiles take only the false reducer branch in nine profiles; full profiles exercise both branches. Typed proof checks cover four numeric types; timing covers U32 only.

Original eager JS/Rust algorithms and strong fused expert JS/Rust controls are frozen before timing. Complete outputs are compared item by item before timing; timing consumes length, sum and weighted output checksum. JS and Rust experts may reuse output scratch. Captured JS calls snapshot both inputs; direct borrowed JS kernels are separate. Wasm calls include input/result bridges. Native C generated from Ink and Rust `-O3` use the same separately compiled timing/observation driver, one shared-library boundary and no cross-library LTO. Resident and input-snapshot modes are separate; generated allocation/free and final output consumption are timed.

There are nine interleaved rounds, one warmup and a 15 ms target per variant/cell. Calibration, warmups, first-call/startup costs, raw samples and memory scope are archived. Timings run sequentially after agent build/test work stops. Two disjoint browser contexts are frozen from the outset; all six tasks in each context are retained. The merged first-validation-call map retains only the first context; complete cold-call evidence is in each raw browser context map. Startup costs sum both contexts. Input generation and compilation are outside kernel timing. This is one shared Apple M2 machine, macOS 26.5.2, with compiler/runtime identities in [metadata](metadata.json); Rust LLVM and Apple Clang versions are not matched.

## Measured improvements over prior Ink

Wins/losses below require the individual paired-bootstrap 95% interval to lie wholly above/below 1. Each row covers the same 72 correlated workload cells; rows must not be summed into independent evidence or a language ranking. Intervals are exploratory and unadjusted for multiple comparisons. Winning ratio ranges are per-case medians, not a suite speedup.

| Target | Faster / slower / inconclusive | Supported winning median ratios |
|---|---:|---:|
| Node captured JS | 72 / 0 / 0 | 1.11–2.49× |
| Browser captured JS | 68 / 0 / 4 | 1.05–2.87× |
| Node Wasm | 9 / 10 / 53 | 1.01–1.23× |
| Browser Wasm | 10 / 11 / 51 | 1.01–1.16× |
| Native resident | 68 / 0 / 4 | 1.00–3.22× |
| Native input snapshot | 69 / 0 / 3 | 1.01–1.99× |

All 21 host-specific Wasm regressions remain in [fresh-regressions.json](fresh-regressions.json). The worst prior/current median ratio is about 0.55, or about 1.82× slower current execution. The generic cost model therefore does not guarantee profitability on Wasm. [Profitability](profitability.json) records per-case recommendations; these offline measurements do not install a runtime policy.

## Against original and expert controls

Current Ink JS beats the literal eager JS algorithm in all 72 cells on each web host. Current native Ink beats the literal Rust algorithm in 70/72 cells in each native mode, with two inconclusive. Rust-Wasm literal comparisons remain mixed and usually favor Rust. Fusing the original algorithm can be useful without exceeding a hand-fused implementation.

| Strong control | Ink faster / expert faster / inconclusive |
|---|---:|
| Node captured expert JS | 20 / 36 / 16 |
| Browser captured expert JS | 3 / 31 / 38 |
| Node borrowed expert JS | 31 / 25 / 16 |
| Browser borrowed expert JS | 16 / 24 / 32 |
| Node expert Rust-Wasm | 0 / 63 / 9 |
| Browser expert Rust-Wasm | 0 / 62 / 10 |
| Native resident expert Rust | 4 / 40 / 28 |
| Native input-snapshot expert Rust | 2 / 33 / 37 |

Six checked vector shaders execute on GPU where staged/prior forms fall back because their collection pipelines are unsupported. This is **new eligibility**, not a prior-versus-current GPU speedup. Prevalidation checks all 468 backend requests: 78 actual-GPU fixture executions and 390 fallbacks. Timings retain 36 actual-GPU cells/324 samples; no fallback is labeled GPU. Empty results dispatch zero times. Transfers match `4*(nx+ny)+28` uploaded bytes and `4*min(nx,ny)` readback bytes per call. Every eligible timed GPU cell loses to captured expert JS; GPU median full-call cost is approximately 3.59–660.71× expert JS across these input profiles. Arbitrary ordered folds do not acquire GPU support in this batch.

The goal of broad native/expert superiority is **not achieved**. These are general callback identities in two collection families, not a broad application corpus. They remove overhead toward fused implementations. Further work should address the result bridge and emitted sharing overhead, validate wider workloads, and examine reusable/incremental state computations where Ink can avoid work that an equivalent eager implementation still performs. This round adds no new Frontier diff/patch law.

## Verification and retained adverse evidence

The retained timed archives contain **22,356 samples**: Node 7,776, browser 8,100, native 6,480. Their exact-output comparisons total **6,936**: 2,736 Node, 3,420 browser and 780 native. The separate 1,872-comparison untimed web validation is not counted twice. All 48 proof selections replay, all frozen inputs remain hash-bound, and the web and native intervals are independently recomputed in the final reviews.

Three fold tests pass across the initial two-pass run and corrected isolated negative-test rerun; the initial shared-Python-alias test-fixture failure is preserved. Three zip tests and three sharing tests pass. Sixteen configured planner tests pass against an authenticated 586-entry fixture containing all 23 declared legacy rules. The unchanged default historical full-discovery scan and full historical integration suite were not rerun. Rehashed false proofs are rejected semantically. Across the three typed author receipts there are 840 frame checks and 1,680 interpreter executions, with overlapping corpora rather than 840 independent benchmark inputs.

720 authenticated Wasm observations increase the canonical ledger from 9,666 to **10,386**. No invented zero-memory JS/GPU/native observations are imported. Canonical proof objects and snapshots remain authoritative; SQLite is a disposable query index.

Storage failures are explicit. Node saved its complete raw archive before a subsequent ENOSPC failure; those same samples were audited without a timing rerun. The first native matrix completed but wrote an empty archive; it contributes no data. The entire frozen native matrix was rerun after removing only the disposable Rust debug incremental cache in this task checkout. Byte-identical transparent filesystem compression and removal of unused disposable overlay indexes preserve all proof/source/result logical hashes. The sharing publication's full SQLite rebuild also failed, then exact checked objects recovered its disposable index incrementally.

A browser archive audit initially compared the three transfer counters to a dictionary also containing `live_buffer_bytes`. The corrected audit verifies the expected three counters and checks the extra field's shape; no runner or timed source changed. The original harness is retained. An initial descriptive GPU table inverted its expert/Ink ratio; those tables are preserved, and [summarise-outcomes-corrected.py](summarise-outcomes-corrected.py) produces the corrected expert-loss verdicts. The frozen original helper remains byte-identical. Neither correction changes any raw measurement or interval.

See [outcome tables](outcome-tables.json), [all expert comparisons](all-expert-comparisons.json), [source audit](code-shape-review.json), [source boundary](source-boundary-after.json), and the final verification/binding manifests. Prior reports and exact parent before-bytes remain retained.

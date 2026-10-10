# Ink accepted-branch proofs — batch 25

Checked proofs remove a repeated predicate branch after filtering, and work in ordered folds and wrapping U32 sums. Backend changes remove scalar-result arena allocation at the Wasm CPU boundary and add early exit to the legacy C emitter. The tables show their separate effects against the previous compiler and optimized JS/Rust implementations. A broad victory across languages remains unestablished: these are five related fresh recipes and four reference tasks on one machine, not a representative application suite.

## General laws and checked database

For arbitrary pure total callbacks, `xs.filter(p).map(x => choose(p(x),f(x),g(x))) = xs.filter(p).map(f)`. Ordinary list induction checks empty and nonempty lists; a case split on `p(head)` removes the rejected head or selects `f(head)`. No callback whitelist, new trusted rule or semantic extension is used. U32, I32, U64 and F32 instances preserve the arithmetic expressions and F32 grouping. Purity matters: callback scheduling is unobservable in these semantics.

Four ordered-fold deployments combine that identity with existing filter/map fold fusion: `foldr(filter(p).map(choose(p,f,g)),z,h)` becomes `foldr(xs,z,x => a => choose(p(x),h(f(x))(a),a))`. The reducer can depend on its accumulator; the exact right-fold order is retained. One U32 sum deployment uses the existing checked predicated mapped-sum law, with zero for rejected elements. This relies on wrapping U32 addition and does not authorize floating-point reassociation or an F32 zero-mask sum.

Publication added **34 immutable checked objects**, bringing the database to **1758**: four optimization endpoints, five deployment compositions, eight fresh source bridges and seventeen newly derived old-only certificates. Nineteen old-only witnesses were retained; two were already historical objects. The old-only comparison catalogue has **1741 entries**, and all of those opportunities are also offered to the current catalogue. Search was bounded to four source applications and 128 expanded bodies per source. All twelve rejected proposals and earlier failed author fixtures are preserved. These are standard identities new to this pinned catalogue search, not claims of new mathematics.

## Leaner targets

C packed dispatch now borrows Bool input words, as U32 already did. Other layouts retain required conversion copies. Scalar32 returns U32/Bool words, I32 modulo bits and F32 raw bits; scalar64 returns U64 directly. The Wasm emitter exports those functions, and the CPU host selects them using the function result descriptor and available exports. Scalar calls avoid the old result header and result arena; missing exports retain compatibility with the generic path. List/record/vector results still use generic transport. The host still captures and copies inputs and creates a small scalar result array; this is not a zero-allocation host call. New U32 ingress borrowing is not claimed.

Legacy native C now shares the existing early-exit recognizer: choice predicates must be accumulator-independent, and each reached leaf must retain the accumulator or replace it independently. A forward loop stops at its first replacement. Accumulator-dependent checksum folds keep reverse evaluation. Early exit can lose on late/absent full scans; those cases remain measured. Production changes are exactly C compute/native lowering, Wasm exports and the CPU host. The other 98 guarded files, semantic core, checker and planner are unchanged. Backend and host transport are trusted implementations backed by tests, not formally verified machine code.

Proof search and selection happen at compile time. Emitted targets contain ordinary target code and existing backend selection, with no added caller validation, optional checker wrapper or runtime proof optimization.

## Five fresh proof tasks (20 cells per host/boundary)

| Host / boundary | Comparison | Confirmed faster | Slower | Inconclusive |
|---|---|---:|---:|---:|
| node | JS captured call · backend on current proofs | 1/20 | 0 | 19 |
| node | JS captured call · proofs on current backend | 20/20 | 0 | 0 |
| node | JS captured call · combined versus old prior | 20/20 | 0 | 0 |
| node | Wasm captured call · backend on current proofs | 7/20 | 2 | 11 |
| node | Wasm captured call · proofs on current backend | 3/20 | 5 | 12 |
| node | Wasm captured call · combined versus old prior | 7/20 | 3 | 10 |
| node | JS synchronous borrowed call · backend on current proofs | 1/20 | 1 | 18 |
| node | JS synchronous borrowed call · proofs on current backend | 20/20 | 0 | 0 |
| node | JS synchronous borrowed call · combined versus old prior | 20/20 | 0 | 0 |
| browser | JS captured call · backend on current proofs | 1/20 | 0 | 19 |
| browser | JS captured call · proofs on current backend | 16/20 | 4 | 0 |
| browser | JS captured call · combined versus old prior | 16/20 | 4 | 0 |
| browser | Wasm captured call · backend on current proofs | 2/20 | 1 | 17 |
| browser | Wasm captured call · proofs on current backend | 2/20 | 3 | 15 |
| browser | Wasm captured call · combined versus old prior | 9/20 | 1 | 10 |
| browser | JS synchronous borrowed call · backend on current proofs | 0/20 | 2 | 18 |
| browser | JS synchronous borrowed call · proofs on current backend | 16/20 | 4 | 0 |
| browser | JS synchronous borrowed call · combined versus old prior | 16/20 | 4 | 0 |
| native / resident | backend on current proofs | 1/20 | 2 | 17 |
| native / resident | proofs on current backend | 12/20 | 3 | 5 |
| native / resident | combined versus old prior | 12/20 | 3 | 5 |
| native / snapshot | backend on current proofs | 1/20 | 2 | 17 |
| native / snapshot | proofs on current backend | 12/20 | 3 | 5 |
| native / snapshot | combined versus old prior | 12/20 | 3 | 5 |

| Host / boundary | Comparison | Confirmed faster | Slower | Inconclusive |
|---|---|---:|---:|---:|
| node | JS captured call versus optimized JavaScript | 0/20 | 20 | 0 |
| node | Wasm captured call versus optimized Rust Wasm | 3/20 | 16 | 1 |
| node | JS synchronous borrowed call versus optimized JavaScript | 0/20 | 20 | 0 |
| browser | JS captured call versus optimized JavaScript | 0/20 | 20 | 0 |
| browser | Wasm captured call versus optimized Rust Wasm | 3/20 | 16 | 1 |
| browser | JS synchronous borrowed call versus optimized JavaScript | 0/20 | 20 | 0 |
| native / resident | versus optimized native Rust | 12/20 | 8 | 0 |
| native / snapshot | versus optimized native Rust | 12/20 | 8 | 0 |

Vector repair and ordered checksum use primary and held-out callback instantiations; total uses the primary callbacks. These are general full-scan algebraic opportunities, but the timed instances are U32. Sizes 32 and 65,536 use two preset distributions with fixed captures across sizes. Size 4,096 is correctness-only. Held-out describes callback expressions, not an external dataset. Strong experts fuse filtering/mapping, evaluate the predicate once, hoist legal invariants, and preserve the noncommutative reverse checksum. Staged original algorithms validate only.

## All nine tasks (72 cells per host/boundary)

| Host / boundary | Comparison | Confirmed faster | Slower | Inconclusive |
|---|---|---:|---:|---:|
| node | JS captured call · backend on current proofs | 1/72 | 4 | 67 |
| node | JS captured call · proofs on current backend | 24/72 | 1 | 47 |
| node | JS captured call · combined versus old prior | 22/72 | 1 | 49 |
| node | Wasm captured call · backend on current proofs | 25/72 | 9 | 38 |
| node | Wasm captured call · proofs on current backend | 4/72 | 6 | 62 |
| node | Wasm captured call · combined versus old prior | 24/72 | 7 | 41 |
| node | JS synchronous borrowed call · backend on current proofs | 5/72 | 4 | 63 |
| node | JS synchronous borrowed call · proofs on current backend | 27/72 | 1 | 44 |
| node | JS synchronous borrowed call · combined versus old prior | 29/72 | 4 | 39 |
| browser | JS captured call · backend on current proofs | 3/72 | 2 | 67 |
| browser | JS captured call · proofs on current backend | 19/72 | 4 | 49 |
| browser | JS captured call · combined versus old prior | 18/72 | 6 | 48 |
| browser | Wasm captured call · backend on current proofs | 13/72 | 4 | 55 |
| browser | Wasm captured call · proofs on current backend | 2/72 | 4 | 66 |
| browser | Wasm captured call · combined versus old prior | 27/72 | 5 | 40 |
| browser | JS synchronous borrowed call · backend on current proofs | 0/72 | 4 | 68 |
| browser | JS synchronous borrowed call · proofs on current backend | 18/72 | 5 | 49 |
| browser | JS synchronous borrowed call · combined versus old prior | 17/72 | 6 | 49 |
| native / resident | backend on current proofs | 17/72 | 13 | 42 |
| native / resident | proofs on current backend | 28/72 | 5 | 39 |
| native / resident | combined versus old prior | 31/72 | 11 | 30 |
| native / snapshot | backend on current proofs | 19/72 | 10 | 43 |
| native / snapshot | proofs on current backend | 24/72 | 3 | 45 |
| native / snapshot | combined versus old prior | 30/72 | 12 | 30 |

| Host / boundary | Comparison | Confirmed faster | Slower | Inconclusive |
|---|---|---:|---:|---:|
| node | JS captured call versus optimized JavaScript | 2/72 | 58 | 12 |
| node | Wasm captured call versus optimized Rust Wasm | 3/72 | 66 | 3 |
| node | JS synchronous borrowed call versus optimized JavaScript | 4/72 | 44 | 24 |
| browser | JS captured call versus optimized JavaScript | 0/72 | 47 | 25 |
| browser | Wasm captured call versus optimized Rust Wasm | 3/72 | 48 | 21 |
| browser | JS synchronous borrowed call versus optimized JavaScript | 2/72 | 51 | 19 |
| native / resident | versus optimized native Rust | 16/72 | 56 | 0 |
| native / snapshot | versus optimized native Rust | 14/72 | 51 | 7 |

First-accepted, filtered mapped-head and indexed kernels provide backend/reference comparisons. Lookup workloads include first, interior, last and absent matches. Captured JS/Wasm, synchronous borrowed JS, resident native and snapshot native are separate boundaries. Native baselines already call kernels/scalars directly; they do not incur an artificial output-store handicap.

| Host / boundary | Comparison | Confirmed faster | Slower | Inconclusive |
|---|---|---:|---:|---:|
| browser | old-prior indexed reference versus js_expert | 0/4 | 4 | 0 |
| browser | old-prior indexed reference versus rust_expert_wasm | 0/4 | 4 | 0 |
| browser | new-prior indexed reference versus js_expert | 0/4 | 4 | 0 |
| browser | new-prior indexed reference versus rust_expert_wasm | 0/4 | 4 | 0 |

WebGPU eligibility and fallback reasons come from the actual emitted manifests. Identical ABI/host/device/WGSL fingerprints are deduplicated. Only actual GPU executions count; CPU fallback is not a GPU result. Filtered variable vectors and arbitrary ordered folds are unsupported by the current GPU path. The frozen CPU selection is used for both compiler versions and all target comparisons; a GPU cost policy was archived but does not secretly select another algorithm. No general adaptive scheduling improvement is claimed.

## Evidence and limits

There are 18 checked selection packages and 36 compiled bundles. The same selected core reaches both old and new backends. A 2×2 proof/backend matrix separates proof gains, backend/host gains and their interaction. Rust uses predeclared handwritten optimized native/Wasm kernels. Rust 1.96/LLVM22 and Apple Clang14 are different toolchains, so native comparisons describe these outputs rather than isolated language properties.

Author tests checked 17 typed functions, 26 source certificates and 127 frames through 254 original/selected interpreter calls, plus semantic false controls. C integration suites passed nine tests and 1,623 interpreter comparisons, with allocation/copy counters and raw F32/scalar payload coverage. Host transport tests cover direct exports, old-module fallback, failure cleanup and input ownership; real compiled Wasm transport evidence is archived under `typed-wasm25/`. Bool borrowing has operation/copy evidence only and is not presented as a timed U32 result. Independent Python source/oracle checks cover 207 frames and 2,508,219 input values; original/expert JS checks cover 414 complete results and nonmutation. Measured runners validate full outputs and consume checksums during trials.

Completed runs contain **25,992 timing samples**, **10,740 complete benchmark comparisons**, and **5,200 independently recomputed intervals**. Every calibration, recorded warmup and round is retained. Timing ran sequentially with author/build/test/audit jobs stopped. Native measured invocations also make three common unrecorded prewarm calls. Checksumming is timed and can dominate constant-time kernels. Browser startup sums three bounded contexts; merged cold-call evidence covers the first context only. The machine is Apple M2/macOS arm64 with Node and the headed in-app browser. Exported Wasm memory is recorded; it is not total process or GPU memory.

A confirmed faster/slower cell requires the whole paired bootstrap 95% interval to favor one implementation. These are exploratory per-cell intervals without family-wise adjustment. Counts are not pooled language rankings. Absolute medians and all intervals are preserved, including **203 adverse backend/proof comparisons**. No failed or slow cells were removed to improve the headline.

Canonical imports added **720 Wasm observations**, bound to actual compiler/Wasm bytes, selected laws and captured workload. The immutable ledger and disposable SQLite index agree on **16,466 observations** and 1758 entries. Correctness authority and profitability observations remain separate. Snapshot: `3edbf7ac57cd7395aaaadf479f3959c9947829751f99956cf4674ef1ba9bdc4f`.

Evidence includes `publication.json`, `catalogue-review.json`, `protocol-compiled-preflight-review.json`, `protocol-final-review.json`, `native-final-review.json`, `verification.json`, `policy-freeze.json`, `pretime-review-bindings.json`, `metadata.json`, `all-comparisons.json`, `regressions.json`, `root-interval-verification.json`, both web summaries, native summary and raw journals. Prior report history and unrelated ownership are preserved. No commit, push or PR was made.

## Completion notes

The initial independent catalogue helper incorrectly required the publication closure to include two already historical witness roots. Its failed log and original helper are retained; the corrected pretime audit independently checks the exact delta closure (59 objects) and the larger static derivation closure (62 objects). A subsequent pretime attempt waited for the author evidence file to exist and then passed. These corrections changed no proof, workload, selected core or measured target. One browser page-state read timed out during the lookup run; the original run saved all 4,860 samples, and its visible passed state was verified without reloading or rerunning it.

The generic optimization is one accepted-branch identity instantiated for four numeric types, plus five explicit checked deployment compositions. Profitability is conditional: on fresh cells, proof-new JS gains occur in all 20 Node cells and 16/20 browser cells; the browser total loses its four cells. Native current output beats the optimized Rust control in 12/20 cells at each boundary, with 8 losses. Rust-Wasm wins for Ink are 3/20 on each host, while optimized JS beats Ink in all 20 fresh cells on both hosts. These counts are specific to the frozen recipes and exploratory intervals; the broad native-performance goal remains open.

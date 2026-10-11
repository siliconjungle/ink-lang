# General sequence semantics and measured proofs — 10 October 2026

Ink now models ordered `List<T>.concat(List<T>)`. Its two recursive definition clauses support **32 newly checked database laws**, taking the catalogue from 700 to **732 entries**. The earlier web batch adds another 52 laws, so this continuation contributed 84 laws in total. The primitive is implemented in the reference evaluator and JS, C/Wasm and Rust outputs. Concat graphs currently use explicit CPU fallback in the WebGPU package.

These laws avoid intermediate concatenation and empty-region copies. On the large full-width browser fixture, checked concat/count is approximately **7× faster in JavaScript**; concat/sum is **8.3× faster in JavaScript and 1.15× in Wasm**. Ordered fold is **1.27× faster in JavaScript and 1.09× in Wasm**. Empty removal and map fusion improve runtime JS here, while their Wasm intervals cross one. This is measured evidence for specific workloads, rather than a universal language ranking.

## Semantics and trust

The [general contract](../../docs/sequence-semantics.md) specifies operand order, element-bit preservation, fresh reference-evaluator output, resource limits and executable versioning. Only the ordinary recursive definition of append was added to the trusted normalizer. Associativity, empty-region elimination, count/map composition, integer sum splitting and ordered-fold composition remain untrusted database equations proved by existing list induction. There are five element-type families: U32, I32, U64, F32 and Bool. F32 fold composition preserves exact operation order; no F32 sum reassociation was added.

Executable programs containing concat use v3; existing programs retain v1/v2 identities. False old-version tags are rejected. Generated APIs trust callers, with no input validators or optional checker wrappers. Reference-interpreter fuel and machine allocation bounds remain resource handling. Optimisation equality concerns pure returned values; selected identity results can borrow input values under that contract.

[The producer](../../knowledge/producers/web_sequence_laws.py), [all32 typed source](proof-replay/all-laws.ink), [admission receipt](proof-replay/admission.json) and [application receipt](proof-replay/selection-check.json) preserve actual local checker replay and reification. A separately rehashed false ordered-concat equation is rejected for mathematical reasons by [the negative-control test](../../knowledge/tests/test_web_sequence_laws.py). A preliminary source file at the report root predates the Bool spelling fix; it is retained as historical evidence and is not the successful replay fixture.

## Measurements

Ratios prior/new above one mean a speedup from the new laws. The table uses the browser full-width fixture with 65,536 left words and 32,769 right words. Intervals are paired bootstrap 95%.

| Task | Prior/new runtime JS | Prior/new Wasm | New direct JS/original JS |
|---|---:|---:|---:|
| concat_count | 6.95× [6.32, 7.16] | 1.07× [1.02, 1.17] | 0.135× [0.127, 0.143] |
| concat_fold | 1.27× [1.26, 1.29] | 1.09× [1.05, 1.21] | 0.776× [0.765, 0.781] |
| concat_sum | 8.26× [7.69, 8.65] | 1.15× [1.03, 1.27] | 0.116× [0.11, 0.121] |
| concat_empty | 1.28× [1.27, 1.38] | 0.975× [0.963, 1.03] | 0.513× [0.513, 0.521] |
| concat_map | 1.1× [1.09, 1.12] | 0.987× [0.975, 1.01] | 0.252× [0.245, 0.28] |

New directJS/originalJS values below one mean checked generated JS is faster than the handwritten original algorithm under the same two-snapshot driver. The control retains the original concat/map/filter/fold stages and receives ordinary JIT optimisation. These comparisons do not cover an expert handwritten implementation of the already-rewritten algorithm. The earlier [52-law suite](../web-stack-proofs-2026-10-10/REPORT.md) also includes matched original Rust/Wasm controls and actual GPU improvements; this sequence suite uses original JS controls and Ink Wasm, without a new Rust/Wasm timing control.

Node full-width large-input runtime JS gains are 7.51× for count, 3.21× for sum, 1.33× for fold, 1.32× for empty removal and 1.21× for map fusion. Wasm sum improves 1.40× [1.09,1.68]; other large-input Node Wasm intervals cross one. The different JS sum gains illustrate engine and host dependence.

Five workloads, two distributions and three sizes produce 30 cells per host. Seven shuffled paired rounds yielded **1,470 samples on Node and 1,470 in the headed Chrome browser**. All 560 Node and 620 browser exact oracle comparisons passed; 50 independent Python literal/source-stage comparisons corroborate the closed-form oracle. Calls include both input snapshots, Wasm ingress, output copies/conversion and result consumption. Module startup and first calls are separate records. The browser obtained Apple metal-3 WebGPU availability, but **zero concat variant/cells executed a shader**; fallback reasons/counters are archived and fallback never contributes GPU timing samples.

Both catalogues use the same new compiler, so improvements isolate selected laws rather than the semantics implementation. The benchmark explicitly chooses authenticated candidates through [select_sequence_laws.py](../../knowledge/producers/select_sequence_laws.py), then locally checks them. **Default structural search does not rank these candidates automatically.** Its current score cannot express the cost of intermediate copies, and some valid transformations have equal or larger structural scores. These measurements provide evidence for a later target/workload-aware profitability model. No universal profitable-law whitelist was added.

## Verification and database

The full distribution invocation passed **192 tests** ([log](distribution-tests.log)). Independent core verification passed its existing20 tests and four concat tests ([log](../../knowledge/research/web-stack-proofs/sequence-core-tests.log)); the knowledge suite passed23 tests ([log](knowledge-tests.log)). Backend-specific JS/C/Rust/GPU receipts and the [independent harness review](../../knowledge/research/web-stack-proofs/sequence-harness-review.md) document exact bit/order cases and fallback boundaries.

Publication was staged and checked before the canonical catalogue changed ([receipt](publication.json)). Earlier catalogue snapshots and frozen compilers remain available. **120 canonical Wasm observations** were imported, taking the database to **2,222 observations**, without changing the proof snapshot ([import receipt](canonical-observation-import.json)). Their memory metric is exported Wasm linear-memory highwater only; host/GPU memory remains unmeasured. JS and fallback receipts stay in the report archive without fabricated canonical memory observations.

[Verification](verification.json) records hashes, sample/interval audits and snapshot preservation. [Browser results](browser-REPORT.md), [Node results](node-REPORT.md), [raw browser trials](browser-results.json), [metadata](metadata.json), [frozen harness](harness.py), [browser screenshot](browser-evidence.jpg) and proof-replay files preserve reproducibility. Use a fresh report directory when repeating the harness.

## Frontier applicability

Frontier's empty-patch and same-parent batching ideas motivate eliminating empty regions and composing contiguous sequence work. The previous eight Frontier-derived equations cover pure wrapping-word no-op models. Concat now supplies a general ordered-sequence semantic building block for further diff/patch work. This does **not** establish full JSON patch, object identity, CRDT causal ordering, state-vector or wire-encoding correctness. Those models need explicit further semantics; the pinned [Frontier source notes](../../knowledge/research/web-stack-proofs/frontier-notes.md) and [CRDT notes](../../knowledge/research/web-stack-proofs/frontier-crdt-notes.md) delimit the available evidence.

All source changes and database publication are local in the research checkout. No commits, pushes or pull requests were created.

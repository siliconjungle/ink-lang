# Web-stack DB proofs, batch 33

One reusable demand-erasure family removes wrapping scans whose values are never observed by a zip callback, while retaining independent-input truncation:

```ink
xs.scan().zip(ys, fn(unused) => fn(y) => g(y))
// checked equal to:
xs.zip(ys, fn(unused) => fn(y) => g(y))
```

The right-input orientation also holds. Keeping the original input preserves `min(xs.length, ys.length)`; deleting the zip would be wrong for unequal lengths. Arbitrary pure total callbacks and arbitrary initial scan states are covered. U32, I32 and U64 endpoints use existing checking rules. No floating scan law, syntax change, core/backend optimization, runtime proof optimizer or caller-validation wrapper was added.

The DB extension contains 26 objects: six typed optimization endpoints, twelve induction/beta supports, four helper-bound source certificates, and four Normalize-only control transports. The four old-only transports are shared by both comparisons: fair prior 2,463 objects, current 2,485. This is one mechanism with two orientations and four U32 source recipes, not 26 independent algorithms.

Certificates preserve helper calls and bind their definitions by content hash. The first authoring attempt expanded helpers and caused the unchanged structural cost model to decline the composed recipes; those proof and preparation artifacts remain archived. The final producer retains helper calls, and the ordinary planner selects all four fresh certificates without forced rewrites or cost-model changes. Raw structural costs fall 288→188 and composed costs 545→345.

## Correctness and generated work

Five new proof tests pass, including 60 complete U32 source replays, 42 nonzero-state U32/I32/U64 closed checks, novelty against all 2,459 prior objects, and rejection of observed-prefix callbacks, rehashed false truncation, and changed retained/discarded helper definitions. Nineteen existing store/publication tests also pass. Independent finite projection checks corroborate the proof and do not replace kernel admission. Previous objects and discovery names are preserved.

Generated GPU raw pipelines change from `[scan, zip]` to `[zip]`; composed pipelines change from `[map, scan, scan, zip]` to `[map, zip]`. The unused mapped producer remains in composed outputs. Every one of the 122 compiled production-source hashes is unchanged, and both sides use the same compiled main engine, SHA256 `04f42856696cbc9a4d5b0523e4a2c5d9d84ae28e0e039f0fd9c305fe2d0a5536`.

Full-output, input-nonmutation and declared output-lifetime validations pass before timing: Node 1,152 rows / 3,072 complete checks, browser 1,440 rows / 3,936 checks, native 384 checks. All 288 recorded GPU validation rows use actual WebGPU, with zero CPU fallbacks. Machine-code and runtime correspondence remain trusted; conformance is not a machine-code proof.

An initial GPU benchmark counter mismatch is preserved. The schema2 single-shader route dispatches over maximum input capacity and reads that capacity plus the length header. The graph route reads the logical output. The corrected harness independently checks these routes against their respective counters; no emitted or production code changed. Raw checked GPU calls can consequently increase readback/buffer costs despite fewer stages. Reported GPU buffer accounting is distinct from driver allocation or CPU heap measurements.

## Measurement protocol

Apple M2, Node v26.1.0, Rust 1.96.0; complete environment is in [environment.json](environment.json). Four recipes × sizes 32, 4,096 and 65,536 × two joint value/unequal-shape regimes give 24 cells per target. Small-word inputs use `ny=nx+7`; full-word inputs use `ny=floor(nx/3)+1`. They vary values and shape together. Empty, one-empty, full-word boundaries, zero divisors and unequal lengths have additional untimed complete-output fixtures.

Native, Node and browser timing run sequentially after all compile/test jobs stop. Nine calibrated, interleaved matched rounds per cell, with warmups and calibration retained. Per-cell paired bootstrap intervals use 4,000 resamples and nominal 95% coverage. Aggregate geometric means are descriptive. Full captured calls, resident destinations and instrumented GPU requests are distinct boundaries; they are not pooled. GPU requests include upload, dispatch, readback and unpacking. Strong handwritten JS and Rust controls directly traverse only the selected shorter prefix and reuse destinations in resident cohorts.

## Performance against the fair prior

Ratios are prior time / checked time, so above one favors the new DB proof. These geometric means describe this fixed four-recipe matrix on one machine.

| Host | Boundary | Geometric mean | Faster / slower / uncertain (24 cells) |
|---|---|---:|---:|

| browser | Full captured JS | 1.569× | 24 / 0 / 0 |
| browser | Full captured Wasm | 1.018× | 12 / 0 / 12 |
| browser | Complete instrumented GPU request | 3.146× | 24 / 0 / 0 |
| browser | Resident Wasm destination | 1.926× | 23 / 0 / 1 |
| native | Native copied-input destination | 1.824× | 24 / 0 / 0 |
| native | Native resident destination | 2.772× | 24 / 0 / 0 |
| node | Full captured JS | 1.161× | 23 / 0 / 1 |
| node | Full captured Wasm | 1.010× | 16 / 0 / 8 |
| node | Resident Wasm destination | 1.935× | 24 / 0 / 0 |

Across the 216 prior/current cells, 194 have nominal intervals favoring checked, 22 are uncertain and zero have intervals favoring prior. Every cell, including uncertain and raw/composed strata, remains in [analysis.json](analysis.json); [regressions.json](regressions.json) is retained even though no prior regression is classified. Eight point estimates are below one, with all eight intervals crossing one; these are retained in [point-losses.json](point-losses.json). This does not guarantee profitability outside the measured inputs, host or protocol.

## Strong controls and practical limits

Most handwritten controls still win. Expert-time / checked-time geometric means are 0.540× Node JS, 0.755× browser JS, 0.414× / 0.437× full Rust-Wasm, 0.614× native resident and 0.734× native copied inputs. Ink has zero confirmed resident-native expert wins, one copied-input native win, one browser expert-JS win, and six resident Rust-Wasm wins on each host. Full Rust-Wasm wins all 24 cells on both hosts. Broad native superiority is not established.

Complete GPU calls improve against prior GPU in all 24 cells, but remain slower than the CPU controls: expert-JS / checked-GPU 0.010× and full Rust-Wasm / checked-GPU 0.029×, with all 24 cells favoring each CPU control. Transfer and scheduling costs dominate this tested size range. Counter instrumentation is charged to GPU calls. These are full-call comparisons, not kernel throughput or a recommendation to always choose GPU.

GPU raw checked calls read back the larger input capacity; heldout checked calls use the graph route and remove two scan buffers, but retain the unused map. CPU heap peak is unmeasured. Output destinations are borrowed in resident cohorts and owned in full-call cohorts. Compile-time proof selection is unchanged; no runtime load/state optimization policy was installed.

## Evidence and reproduction

The frozen run contains **7,560 timing samples**: 1,728 native, 2,592 Node, 3,240 browser. All three target audits pass. [Paired analysis](analysis.json) has 672 comparisons, including strong controls; [analyze.py](analyze.py) reproduces the aggregation and additional intervals. Canonical performance observations remain empirical data, separate from mathematical admission.

- [Final proof checks](proofs-direct/proof-completion.json), [ordinary staged admission](staging-direct/stage.json), [independent proof review](review/proof-staging-direct-review.json).
- [Frozen target metadata](targets-final/metadata.json), [Node audit](targets-final/node-audit.json), [browser audit](targets-final/browser-audit.json), [native audit](targets-final/native/audit.json).
- [Counter correction](benchmark-preparation/gpu-counter-contract-correction.json), [independent counter review](review/gpu-counter-contract-review.json), [initial cost-decline diagnostic](benchmark-preparation/first-selection-diagnostic.json).

Reproduce proof checks with `PYTHONPATH=knowledge:planner INK_PIPELINE33_PROOFS_DIR=/tmp/ink33-proofs python3 -m unittest knowledge.tests.test_web_pipeline33_laws -v`, using the exact recorded main compiler. Stage `candidate-rows-direct.json` with `knowledge/producers/publish_web_pipeline33.py`; `--stage` writes private fair-prior/current views, and `--publish` separately publishes only completed checked staging. `bench/web-stack-proofs-33.py prepare` accepts both staged catalogues and the byte-identical batch32 cost model. Use a fresh report directory; archived evidence is never overwritten. The script and README in the benchmark directory describe separate preparation, validation and timing modes.

## Canonical publication

[Publication receipt](publication.json) records canonical snapshot `3c78ba2b4059c318afafca2f087c774139c00dc666288c207598b7c91abb2957` with 2,485 checked entries and 4,232 discovery names. All 2,459 prior entries and prior discovery names are preserved. The 26-object extension contains 22 fresh objects and four shared old-only Normalize transports.

[Observation import](observations.json) records 840 new empirical groups, bringing the total to 22,580. All 21,740 previous observation files retain their exact bytes. [Final verification](verification.json) also verifies the unchanged 122 production sources and frozen compiler. The [independent performance review](review/final-performance-review.json) replays all 672 comparisons from raw samples. Publication does not install a runtime selection or cost-model policy.

The knowledge repository is committed directly on `main` at `8edf20f7a360a044da5bfa247c19fcebfcbc9112`. The distribution integrates that exact submodule pin.

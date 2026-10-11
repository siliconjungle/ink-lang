Independent batch38 performance review: PASS.

The replay verifies 7,560 raw samples in 840 groups, nine measured rounds per group, all 672 paired comparisons with their exact seeded 4,000-draw bootstrap intervals, 28 aggregate geometric means and 112 orientation/plain-versus-composed recipe strata. It checks every frozen target (350), native (107) and production source (122) binding, proof/staging bindings, both exact catalogues, the frozen compiler, and all 25,940 prior observation bytes. No new timings were run.

The full prior catalogue contains 2,534 entries. Its ordinary planner applies no law to these four sources; the 2,550-entry staged catalogue applies one fresh source certificate to each. This is one mathematical fusion family with six typed/oriented integer endpoints, six Nat/beta supports and four U32 helper-bound deployments. Same-origin mapped prefixes and appended padding are structural application conditions. Both indexed mapper values and the ordered pair callback remain observed; extent is xs.length and indexes wrap to U32. Endpoint novelty is an alpha-equivalence result, not proof that older law chains could not derive it.

Ratios below are prior time divided by checked time. They describe these fixtures and boundaries, not general language speed.

| Host and boundary | Geometric mean | Faster / slower / uncertain |
| --- | ---: | ---: |
| browser — captured-js-owned | 1.2621× | 20 / 2 / 2 |
| browser — captured-wasm-owned | 1.0006× | 4 / 3 / 17 |
| browser — instrumented-full-gpu-request | 3.3458× | 24 / 0 / 0 |
| browser — resident-wasm-destination | 1.0463× | 20 / 4 / 0 |
| native — captured-native-destination | 1.4001× | 22 / 0 / 2 |
| native — resident-native-destination | 1.6703× | 22 / 0 / 2 |
| node — captured-js-owned | 1.1893× | 17 / 4 / 3 |
| node — captured-wasm-owned | 1.0067× | 5 / 2 / 17 |
| node — resident-wasm-destination | 1.0369× | 17 / 5 / 2 |

All 216 prior comparisons are retained: 151 classified gains, 20 classified regressions and 45 uncertain cells; 35 point estimates are below one. All 20 classified regressions occur in the composed recipes (nine left, eleven right), and 15 occur at length 65,536. Node contributes 11 and browser nine; native and GPU contribute none. The joint shape/value regimes are not independent one-factor experiments. This review does not infer a JIT or backend cause from timings alone.

Actual named GPU routes change from four active graph stages in literal/prior to one legacy shader dispatch in checked (zero for empty xs). Across 648 timed GPU rows, all 6,228 calls execute on GPU with zero fallback: 1,314 literal, 1,440 prior and 3,474 checked. An additional 1,312 calibration calls have the same verified contracts. The prior GPU geometric mean is 3.3458× with 24/24 classified gains. Checked uploads 20 more bytes, and readback remains 4*(nx+1) bytes. Graph live memory is 4*(5*nx+2*ny+8+max(1,nx)); legacy is 4*(4*nx+ny+12). Graph header and payload staging are sequential, so peak live storage differs from total readback. Empty/tiny cases do not support a universal memory-reduction claim.

Full-call Wasm gains are approximately 1.0006× in browser and 1.0067× in Node, while resident Wasm gains are 1.0463× and 1.0369×. Transport/setup and returned-output ownership remain distinct boundaries. Every output word is consumed inside each web timer with a length-plus-weighted-U32 checksum. Native independently consumes a complete-vector U64 code. Calibration doubling/stopping and chosen iterations, all web warmups and exact xorshift sample interleaving, all native seeded interleaving and subprocess journals, checksum totals and consumed-element counts independently match the raw receipts.

Already fused controls remain challenging: native Rust/checked ratios are 0.7522× resident and 0.8078× captured; browser expert JS/checked is 0.9081×, Node 1.0688×. Rust resident Wasm is near parity but generally faster (0.9629× browser, 0.9790× Node); full Rust Wasm is faster (0.4851× / 0.4588×). Checked GPU is also much slower than fused CPU controls at these sizes (expert JS/GPU 0.0217×; full Rust Wasm/GPU 0.0464×). Every strong-control classified loss, uncertain cell and point loss is retained in the JSON. Ink native targets here are generated C built by clang, compared against Rust controls; this is not Ink-to-Rust lowering.

These are single-machine descriptive results. Nominal per-cell 95% bootstrap intervals do not include a multiplicity correction; cells share fixtures and are correlated. Four orientation/composition recipes are not four algorithm families, and names containing heldout are composition probes without an independent statistical holdout. No F32, WebGPU U64, runtime-adaptive routing, general whole-program superiority, peak-heap or driver-memory claim follows. Backend finite conformance checks supplement the checked algebra without proving universal backend correspondence.

Evidence: final-performance-review.json, audit_performance.py, proof-staging-review.json and target-preflight-review.json in this review directory.

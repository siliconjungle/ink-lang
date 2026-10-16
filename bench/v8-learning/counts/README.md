# Fixed counts: checked machinery, source correctness and measured execution

A separate `fixed-counts-v5` interpretation lets the general proof checker
reconstruct the existing fixed-width count primitives. The knowledge package
contains eighteen ordinary RUP equations, totaling 297,075 canonical law bytes:
count-based zero tests and counts of a constructed one-bit word, across U32,
I32 and U64. Source replacements preserve strict operands and wrapping counts.
No optimizer pattern, solver, profile premise or larger budget enters the core.
The core addition implements fixed primitive circuits; equations and discovery
remain independently pinned database data.

The new tests exposed and repair a normalization defect: reifying a typed U32
literal through an overloaded count could infer U64. The old current-main image
accepts the false `leading_zeros(U32 0) = 64`; the fixed image rejects it and
accepts 32. Typed hygienic bindings preserve the checked width and evaluation.
Malformed count arity rejects. This correction also applies to ordinary
`Normalize`, independently of the new proof interpretation.

## Compiled execution

The development program folds `popcount(wrapping_shl(1, k))` over varying U32
counts, accumulates a wrapping U32 result, and adds an observed cohort. The
constructed word is U64. Baseline and selected programs use the same source and
an ordinary, explicitly checked equality plan. Complete resident calls include
the adapter boundary and consume full results. Build, loading, reference
validation and initial shader setup are separate.

| Integrated compiler `85531171696b` | Training before/after ratio | Held-out input ratio | Existing CPU gate |
|---|---:|---:|---|
| JavaScript, compact boundary | 2.596× | 2.501× | selected in both splits |
| Native Rust, JSON boundary | 0.937× | 1.000× | baseline in both splits |

These CPU ratios use the existing profile-weighted complete-call estimates.
Each split has three fresh processes and eleven rounds, with disjoint normalized
typed inputs, lengths and cohorts. The JavaScript candidate passes the existing
10% gain and sample-extrema guard. The earlier development image also passes
(2.575× training, 2.596× holdout); its compiler/context remains distinct.

Actual same-device GPU execution validates capture/upload, dispatch, submission,
readback, decoding and complete consumption before and after timing. The median
of three held-out paired process-median ratios is approximately 1.617×. Two of
three held-out processes pass the stricter 10% extrema control; one does not.
All three training processes pass. Device memory remains unknown. These explicit
observations do not change automatic GPU placement or infer a CPU-placement win.
The empty control still executes the scalar cohort path on the device.

This is a count-heavy development workload with held-out inputs. The frozen
program corpus below assesses a different generalization boundary. Whole Ink
applications and Frontier comparisons have no new performance result here.

## Rejected quotient candidate

A private exhaustive five-bit Cases proof derives U32 division by a constructed
power as a right shift, using 32 checked constant quotient dependencies. Lossless
existing hint packing gives a 33-object, 8,955,489-byte view, admitted without
changing core or proof limits. Real source plans preserve strict operands and
unused lazy defaults, including full-width/wrapping counts.

Its complete-call measurements reject adoption: held-out before/after ratios
are 0.837× on JavaScript and 0.915× on native Rust; the GPU comparison provides no
reliable gain. The candidate stays outside the installed catalogue. Its selected
portable proof and all measured inputs remain reproducible. Failed unsplit
quotient/remainder authoring trials grant no equality and do not become laws.

## Validation and scope

The final core is the exact 230-file tree
`4e2edfd5fe5c357d27291a8b875016ad613a4eaa`, in standalone package
`3cd7c50878b9891356250cfb23b9e64d58b0b124`, sourced from distribution
`912e719e7545a961f815f9fce4963912f0c9c45b`. All 493 tests pass in a fresh private
checkout and isolated target, with examples built and doctests passing. All
runtime/backend dependency revisions use matching core/Rust/JS pins; metadata and
locked fetch finish successfully. Their emitter implementation bodies are
unchanged.

All 341 integer, 83 word and 15 F32 library roots replay, alongside the eighteen
new count roots. Sixteen package-qualified test methods cover those libraries,
source applications, strictness and rehashed false goals. Initial unqualified
unittest discovery passed thirteen methods but could not import the word module;
its three methods pass in the separate package-qualified retry. The original
exit-one log remains intact.

A minimal validation workspace materializes only 36 exact first-order lockfiles
and 647 unique proof objects (6.58 MB, hardlinked across 2,485 paths). All 647
original seeds and 60 deterministic mutations pass. The initial production
workspace attempt reports an empty corpus because research fixtures are sparse;
no production research inputs were changed to repair that test environment.
The existing eight-operation frozen-program test matches 144 outcomes and exact
snapshots across source/native/JavaScript/Rust-Wasm. The new count source matches
23 complete calls on each of four literal JS/Rust-Wasm lanes, including 72
mapped count records per lane and full U64 boundaries. Real GPU calls also match
the independent original-source oracle.

Both frozen ten-program planning runs finish with terminal zero and unchanged
captured context, against private publications. The pre-count run has nine
programs with alternatives, twenty admitted laws and six reused laws. The final
run has ten, twenty-two and six respectively; both choose zero alternatives.
None of the eighteen count-root identities is attributed in the final corpus.
Shared-host, wall-time-bounded funnel differences and timings do not establish
count-law generalization or causal compiler acceleration.

168 exact immutable observations retain all successes and failures: 120 CPU and
48 explicit-device rows. Entries are empty, proof snapshot and selection policy
remain unchanged, and contexts/samples/memory scopes are not relabelled.

## Reproduction and retention

`selected-inputs.tar.gz` stores selected immutable input bytes once by SHA-256;
`selected-inputs-index.json` maps historical logical paths to blobs, including
explicit newline reconstruction for staged plans. It retains source/core/plans,
required proof closures, emitted JS/native/Wasm/device assets, actual lockfiles,
source oracles, raw process reports, validation logs, two complete corpora and
exact source/package/runner receipts. It omits private stores, dependency copies
and generated build targets. Selected compiler images remain local baselines;
Git retains their full source revisions.

From the repository root:

```sh
PYTHONPATH=knowledge:planner python3 bench/v8-learning/counts/audit.py
PYTHONPATH=knowledge:planner python3 bench/v8-learning/counts/audit.py \
  --compiler /path/to/compatible/ink --scratch /fresh/replay/directory
```

The replay checks all eighteen count laws and both source plans through the
ordinary checker, and requires the false width-normalization proof to reject.
Archived runners and package pins reproduce acquisition with fresh contexts;
loading an old timing record never substitutes for a new measurement.

The completed owned 1.9 GB core-test target was retired after private validation.
Other selected proofs, measurements and active inputs stay protected. The 100 GB
free-space reserve is still unmet; unclassified/shared inputs and active workers
were left intact. All twenty-two V8 review families remain partial.

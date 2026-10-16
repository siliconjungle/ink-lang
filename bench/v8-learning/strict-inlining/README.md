# Strict source-call unfolding and GPU word conversions

V8 TurboFan and Maglev inlining preserve already evaluated SSA argument nodes,
control/effect context and exceptional returns. Ink's database producer now binds
every formal argument once, in declaration order, before entering the unfolded
body. This covers unused arguments, U64 and composite carriers without a scalar
whitelist. Caller branches remain lazy. These are ordinary source-bound Normalize
proposals; source definitions, types, lexical scope and proof budgets are checked.
The full optimizer audit and pinned upstream revision remain in `../audit.json`
and `../coverage.md`; reading these files does not close the inlining family.

The generic checker tries existing capture-avoiding lexical beta steps before
congruence can expand unchanged arguments. The regression compares proof work for
1,000- and 65,536-step unchanged helper arguments: it is identical. Changed helper
contexts, escaped callback binders, exhausted shared budgets and unsupported closed
nested F64 proof terms reject. No theorem whitelist, new certificate semantics or
higher proof budget is introduced. This is a proof-checking capability and a
strict-interface correction; it does not establish a runtime speedup.

The isolated exact core package passes 457 tests (`core-package*.json` and raw
validation log). Twelve GPU package tests pass. The pin-bound cross-target suite
matches all 50 complete reference/native/JavaScript/Rust-Wasm values and exact
snapshots, plus 50 native GPU-host results and ten actual device dispatches.
The suite covers U64 wrapping boundaries, unused expensive arguments, reversed
parameter positions, callback capture, caller-arm laziness, exact F32 payload
copies, widening and narrowing. Low-fuel tests retain unused argument work and
lazy branch behavior. Pure source fixtures emit no events. Related knowledge
regressions replay all 83 word and 15 F32 frozen laws; final integration receipts
record the combined 37-test suite after merging independent knowledge-main work.

Actual device validation exposed missing literal U32/U64 conversions. The GPU
backend now maps widening to a zero high word and narrowing to the low word using
the existing packed two-lane ABI. Naga validates both direct and graph shaders;
actual kernels exercise boundary values. This grants no range fact, rewrite or
profitable-selection authority, and does not change executable core semantics.

## Complete-call controls

Default semantic discovery (32 checks, four rounds, unchanged budgets) admits
three applications during exploration, rejects twelve premises and records one
duplicate, but selects no application: structural estimated cost stays 128.
The measurement below separately supplies one explicit, ordinary checked strict
unfolding of `twice(reduce(xs))`; it is a mechanism control, not an automatically
found or selected improvement. `default-semantic.json` and `search-report.json`
retain the distinction.

| Generated call boundary | Training baseline / candidate ns | Holdout baseline / candidate ns |
|---|---:|---:|
| JavaScript compact boundary | 174235 / 170362 | 159988 / 160014 |
| Native generated JSON values | 96925 / 101523 | 107141 / 107595 |

Both retain the baseline under the unchanged 10% minimum-gain and sample-extrema
guard. No reliable runtime gain is established. Each split uses three fresh
processes, eleven rounds, disjoint typed lengths/values and an empty control.
Complete U64 results are consumed; the independent source oracle checks outputs
and unchanged inputs before/after timing. Resident calls exclude build/loading
and external argument preparation, and include normal boundary decoding,
execution, encoding and complete consumption. Setup/build and host peak RSS are
recorded separately. Absolute target numbers are not comparable. Other required
work shares the host.

`measure.py` uses official complete-call acquisition and independent rank;
`replay.py` reproduces both decisions from immutable observations without timing
new calls. Retained inputs include source, proof packets, requests, typed
training/holdout workloads, emitted text sources, exact native locks and compiler
contexts. Build targets, disposable indexes and private mutable publications are
omitted. The historical acquisition image is recorded in `compiler-image-final.json`:
it includes the final beta priority, predating subsequent consumer pin and GPU
conversion integration. Final integration has its own image/source pins.

## Reproduction

Use the repository's local Cargo entry point and exact Git pins. For direct
isolated toolchain builds, first obtain and pass the configuration arguments from
`ink-cache prepare-sources ROOT`. Preparation is outside measured intervals;
timed compiler flags and isolation remain unchanged. Disable debug/incremental
output for untimed generated checks.

From the distribution root, run the existing required strict-inlining case with
`INK_PARITY_REQUIRE_ALL=1 INK_TEST_WASM=1 INK_TEST_WGPU=1 cargo test --test proved_refinement_parity strict_inlining -- --nocapture` and
related knowledge modules with `PYTHONPATH=knowledge:planner`,
`INK_COMPILER=target/debug/ink` and `build/proof-python/bin/python -m unittest`.
The pinned knowledge test fixture and producer reproduce the ordinary selection
packet. `integration` retains exact source, selected core, request, expected
values/snapshots, generated text and device receipts. Rerun `replay.py` under the
same Python path for the two selection decisions. Source history preserves
compiler/package revisions rather than retaining a frozen binary for each one.

## Frozen corpus

The required ten-program quick corpus completes all ten compilations. Nine admit
checked alternatives; 24 distinct laws are observed and six are reused across
programs. No representation or alternative is selected: nine stop at measurement
evidence and one has no alternative. All quick budgets expire; the median
reported compilation interval is 56.037 seconds, excluding private knowledge
preparation. No unfolding law attribution or near-miss reason is recorded. This
does not establish broad generalization or a compiler/runtime speedup.

`../corpus-call-inlining` retains captured inputs, plans, context and terminal
records; the adjacent summary records attribution. Concurrent explicit
frozen-composition producer changes were merged after the run and validated
separately. They are outside its captured source digest. A prior prototype corpus
was started before the final kernel priority regression; it is excluded from
final evidence and its completed generated outputs are retired.

## Final combined core

Concurrent package publication supplied a more general bounded call-exposure
strategy for the same first-order conversion failure found during integration.
The final core adopts that existing strategy and retires the overlapping local
four-control probe. It seeks an existing continuation call for at most sixteen
fixed head reductions under the unchanged speculative/shared budgets, then checks
every argument normally. A function identity stops search and supplies no fact.
The regression preserves a large unchanged continuation and checks work below
4,096 units; existing capture, unknown-branch and resource refusal tests remain.
This is independent generic proof machinery, not a new V8 source law.

`integration/core-package.json` records the already published exact package and
its identical committed integration core tree. The historical 457-test package
remains separate. Final standalone validation covers 458 tests. Final pin-bound
CPU/device and knowledge results, compiler image and all independent source
revisions are recorded under `integration`. Historical timing and frozen-corpus
claims retain their original compiler contexts; no timing gain is attributed to
this later merge.

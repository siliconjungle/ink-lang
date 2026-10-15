# Conditional word facts

15 October 2026, Apple M4 Pro, Node 22.22.1, macOS arm64. This is a designed
mechanism experiment for Freerange-inspired inference, not evidence of broad
layout/database/neural performance or completion of the three-project roadmap.

The knowledge-side analyser now tracks one excluded unsigned value, transports
it through wrapping bijections, and refines expression ranges using comparisons
between variables. Two bounded passes let an earlier `x < y` consume a later
`y <= 256` conjunction. It does not assume unsigned arithmetic cannot overflow.
Multiplication by two deliberately does not inherit an exclusion: distinct
inputs can have the same wrapped product.

An offline acquisition command discovers four whole-function alternatives from
ordinary source, reconstructs their circuits through Ink, authors RUP proofs,
replays each law and checks the complete source selection before publication.
The admitted laws are also available to the existing word-identity catalogue;
function names and inference metadata provide no checking authority.

## Validation

The focused Python run passes 32 tests, including independent generated value
oracles, boundary inputs, branch joins, scoped cache reuse, existing LLVM discovery
and ordinary proof replay. New Rust integration reconstructs the acquisition,
rejects an incorrect noninjective replacement, and checks 88 values across the
reference, Rust, JavaScript and Rust-Wasm implementations, including one actual
eligible wgpu call. Snapshots are compared exactly. F32 and signed-word inference
are explicitly outside this unsigned domain.

These are partial fact-inference capabilities. General backward requirements,
interprocedural summaries, callback fact transport, floating-point inference,
diagnostic explanations and more physical consumers remain open.

## Execution observations

Three fresh processes per development/held-out seed, eleven paired samples per
process; medians of process medians. The following held-out boundary-distribution
rows contain 65,536 scalar calls, or one complete 65,536-item list call for
`mapped`. Milliseconds per batch, including result consumption:

| Source function | Baseline | Proved alternative |
| --- | ---: | ---: |
| bounded | 0.788 | 0.459 |
| excluded | 0.432 | 0.407 |
| wrap64 | 1.111 | 0.396 |
| reversed | 1.115 | 0.401 |
| collision (unchanged) | 0.434 | 0.434 |
| mapped | 0.165 | 0.155 |

Gains depend on the workload. For uniformly distributed words, `bounded` takes
0.954 versus 0.936 ms, and the unchanged collision control takes 0.940 versus
0.954 ms. Shared dispatch, JIT behavior and consumption dominate some cheap
calls. Small/empty cases and every loss are retained. Empty scalar batches
perform no Ink calls. No confidence interval, first-call benefit, whole-program
speedup or automatic selection decision is asserted.

Raw samples are in [raw](raw), per-distribution/cohort summaries in
[summary.json](summary.json), provenance in [metadata.json](metadata.json) and
proof details in [proof-acquisition.json](proof-acquisition.json) and
[proof-replay.json](proof-replay.json). The [reproducer](../../bench/conditional-facts/README.md)
separates acquisition, checking, compilation and execution.

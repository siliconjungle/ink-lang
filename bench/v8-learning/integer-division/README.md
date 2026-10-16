# Signed words and checked integer division

Pinned V8 machine-operator reducers use fixed-width arithmetic, signed quotient
bias and remainder masks for constant powers of two. The outside dependency
`src/base/division-by-constant.{cc,h}` is now explicitly acquired and reviewed.
The exact source inventory, read ranges and remaining whole-optimizer work are
in the adjacent audit and coverage files. Every optimizer family remains partial.

Core reconstructs the general meanings in explicit `fixed-scalars-v4`: I32
wrapping arithmetic, signed comparisons, arithmetic right shifts, and checked
U32/U64/I32 division/remainder with lazy source defaults. A restoring divider is
fixed machine semantics, not a constant-divisor optimization recognizer. Existing
source modes and executable meaning remain unchanged. F64 proof terms still
reject, including closed nested terms. Gate tests independently exercise both
encodings with high input bits, zero divisors, signed overflow and random pairs.

Generic bounded word extensionality checks a nonempty cover of every endpoint
bit. Each part proves the entire masked equality with ordinary proof rules and
shares the existing node/depth/circuit/RUP budgets. Missing, zero, out-of-width,
incorrect or unsupported covers reject. External authoring may split a difficult
certificate; neither a mask, digest, solver outcome nor upstream provenance grants
an equality fact. The database owns the actual strength-reduction algorithms.
Typed lexical bindings retain unused and repeated strict operands; exceptional
defaults remain lazy. Arbitrary-divisor magic-number authoring and multiply-high
expressibility/proofs remain open.

The standalone core package passes all 464 tests. Required integration compares
150 complete reference/native/JavaScript/Rust-Wasm values and exact snapshots,
plus native GPU-host outputs and 90 actual device calls. These pure fixtures emit
no events. The knowledge suite independently checks every proposed formula and
strict/lazy evaluation trace, replays frozen laws, checks default discovery under
renamed operands, rejects a rehashed false overflow rewrite and observes unused
and repeated helper work under bounded reference execution. Related regressions
replay the previous 83 word and 15 F32 laws. Conformance establishes no speedup.

## Reproduce

Use exact full Git pins and the local Cargo entry point. Isolated direct toolchain
builds require the actual configuration arguments returned by
`ink-cache prepare-sources ROOT`, outside the measured interval. Keep timed flags
and isolation unchanged; disable debug/incremental output for untimed validation.

Run `cargo test --test proved_refinement_parity integer_division -- --nocapture`
with `INK_PARITY_REQUIRE_ALL=1 INK_TEST_WASM=1 INK_TEST_WGPU=1`. Run the knowledge
integer suite with `PYTHONPATH=knowledge:planner`, `INK_COMPILER=target/debug/ink`
and a Python environment containing the pinned dependencies. The frozen law
library and source fixture live in the independent knowledge repository.
`cross-target-inputs.tar.gz` retains source/core/selection packets, requests,
expected complete values/snapshots, generated text and device receipts; targets,
private publications and compiled binaries are omitted. Git pins preserve source
history instead of copies of every compiler image.

`authoring/` records successful and rejected acquisition attempts and their exact
compiler hashes. Reproduction scripts run from the distribution root with their
scratch under `build/v8-signed-division`; ordinary checking is mandatory before
publication. Initial whole-word authoring predates word extensionality; decomposed
acquisition uses the final generic checker. Authoring durations are bounded
acquisition observations, not isolated compiler/runtime performance measurements.

`measure.py` uses official complete-call acquisition, independent rank and disjoint
holdout, with source-oracle checks, complete high-bit U64 output consumption,
unchanged inputs, fresh processes and empty controls. Default discovery/ranking
receipts are retained separately from the explicitly checked two-candidate
quotient mechanism control. Profitability requires both training and holdout to
pass the unchanged 10% gain and sample-extrema guard. No evidence retains the
baseline. Other required work shares the host; absolute target timings are not
cross-target comparisons. Setup/build/startup are recorded outside resident calls.

## Acquisition and complete-call result

The final library admits 337 of 340 proposed laws: 272 whole-word certificates,
44 fixed-mask covers and 21 adaptively split covers. U64 quotient by itself,
remainder by itself and remainder with a zero numerator remain unadmitted after
bounded authoring; their formulas are absent from discovery. The complete
proposal oracle includes those formulas, but that test is not equality authority.

Default 32-check semantic discovery selects the same single quotient-by-eight
application as the explicit mechanism control, reducing estimated structural
cost from 172 to 156. Exploration records five admissions, eleven rejections
(ten premise, one closure) and two duplicates. Structural estimated cost is not
a runtime measurement.

| Boundary | Training baseline / rewrite ns | Holdout baseline / rewrite ns |
|---|---:|---:|
| JavaScript compact | 277622 / 250802 | 303672 / 271141 |
| Native JSON values | 133146 / 131808 | 170886 / 168542 |

These are weighted work-equivalent resident costs (10,000 work calls plus one
empty control, divided by 10,000). Both targets retain the baseline under the
unchanged 10% gain and sample-extrema guard. JavaScript's lower observed costs
do not establish a robust accepted speedup. Each split uses three fresh
processes and eleven rounds. Full high-bit U64 inputs/results pass the independent
source oracle and unchanged-input checks. `measurement-summary.json` retains
exact weighted totals/guards; `replay.py` independently reproduces both final
selection decisions from immutable observations without timing new calls.

The merged five-target initialized-artifact regression also passes with the
latest database's five shared helpers. Its previous 31-helper test expectation
was stale; the failed receipt and corrected final replay remain separate.
The 35 related knowledge tests pass, including the previous 83 word and 15 F32
frozen certificates. These validations do not certify the whole compiler.

The final integer knowledge suite passes four tests in 438.770 seconds, including
independent ordinary replay of all 337 frozen equalities. The three unadmitted
formulas remain outside the frozen index and default discovery.

When manually replaying the raw conformance selection from the archive, compact
its JSON whitespace first: its diagnostic pretty printing is 24,165,365 bytes,
while the same parsed packet is 4,447,777 compact bytes. The compact packet
passes ordinary `check-selection` under unchanged CLI size/proof limits.

## Frozen corpus

The final quick corpus compiles all ten unchanged programs; nine admit checked
alternatives, 20 distinct laws are observed and six are reused across programs.
No alternative or representation is selected: nine stop at measurement evidence
and one has no alternative. All ten quick budgets expire; the median recorded
compilation interval is 52.9235 seconds, excluding private publication preparation.
No near-miss reason is recorded. Every observed law identity already appears in
the pre-integer combined report, so this run observes no new integer-law admission.
It does not establish broader corpus generalization from the 337-law cohort.

The earlier combined report records 24 laws and ten programs with alternatives.
Different source/compiler contexts and saturated quick budgets prevent a causal
performance conclusion from these unpaired counts or durations. Profiling generic
frozen-library dispatch is a follow-up before further catalog growth. The new
mechanism fixture is separate from this frozen held-out corpus. Exact captured
inputs, plans, context, terminal records and source pins are retained in
`../corpus-integer-division`; the adjacent summary records funnel, reuse and
comparison limits.

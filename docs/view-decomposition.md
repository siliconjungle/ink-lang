# Checked view decomposition

Maintained views are `keep`s of the form `sum(T.values().stage*)` or
`count(T.values().stage*)`, where each stage is `map(fn(x) => e)` or
`filter(fn(x) => p)` with a pure body. The compiler maintains such a view
incrementally by adding and removing each row's contribution (its
*projection*). Until now it was **assumed** that the pipeline equals the sum
of those per-row projections. With `--prove-views`, that fact is now **checked**
automatically for each maintained keep in the supported subset. Builds without
that flag retain their existing trusted decomposition; this is not yet the
generic stateful candidate admission path.

## How it works

1. **The compiler states the meaning.**
   `row_model::export_view` (`ink model-view`) translates the keep literally:
   - one list function per source stage: a map produces `Cons(e(head), self(tail))`, and a filter
     produces `if p(head) then Cons(head, self(tail)) else self(tail)`
   - the final `sum` or `count` fold
   - `pipeline(rows)`
   - `decomposed(rows) = Σ projection(row)`, where `projection` is the
     existing row model

   The obligation is `∀ rows. pipeline(rows) = decomposed(rows)`. Each
   lambda goes through the same translator as the row model.
2. **An untrusted producer proves it by instantiating database laws.**
   `knowledge/producers/view_decomposition.py` does no induction of its own.
   Every step instantiates a general law from `knowledge/research/general-laws`
   (see [general-laws.md](general-laws.md)). Each law is stated once over
   abstract sorts, functions and a monoid, and checked once:
   - a map stage instantiates `sum_map`
   - a filter stage instantiates `sum_filter`; its assumption `plus(a, 0) = a`
     is discharged by computation
   - the final step instantiates `sum_congruence`; the assumption that the
     two per-row projections agree is discharged by computation

   The compiler's stage functions are literal instances of the general `map`
   and `filter`, with the stage lambda as `f` or `p`. The producer adds one
   projection definition and its sum per stage, and the kernel checks that
   they are exactly the instantiated general definitions. It works for any
   number and order of stages without per-program input. The evidence bundle
   keeps only the exported definitions, the new sums and the imported laws, at
   most 64 objects for the tested six-stage chain.
3. **The kernel checks it.** `row_model::verify_view` (`ink verify-view`)
   re-exports the obligation from the actual source. It then:
   - requires every exported definition byte for byte
   - loads the bundle with the unchanged general kernel
   - checks the proof of the exact obligation
4. **It is automatic in builds.**
   `ink emit-state SOURCE --maintenance PKG --prove-views` does steps 1–3 for
   every maintained keep, and archives the evidence under `views/`. It records
   the result in `plan.json` (`view_decompositions`, `view_authority`) and updates
   the trusted list. If any keep lacks a checked decomposition, the build falls
   back explicitly to the recomputing baseline, with no maintenance, and records
   `view_fallback` with the reason. `--require-views` fails the build instead.
   The assumed decomposition is never used silently. `--view-tool` selects
   another producer, which is checked the same way.

## Unsigned fields

`Int(x)` for a u32/u64 value read from a row used to be rejected ("symbolic
unsigned-to-Int correspondence"). It is now translated faithfully, using
ordinary definitions with no new primitive:

- Bit `i` is `x * 2^(63-i) >= 2^63`, using wrapping U64 multiplication.
- Horner's rule accumulates `2n + bit` over `Natural`, eight bits per definition.
- The cast is wrapped as a function of the row. It is structurally recursive on
  the row, but never calls itself. Concrete rows therefore evaluate exactly,
  while symbolic proofs never expand the 64-bit conversion.

u32 *arithmetic* before a cast (`Int(row.count + 1)`) still fails closed,
because it needs its exact modular width.

## Coverage and validation

`tests/view_decomposition.rs` covers:

- **Pipeline shapes.** Ten shapes are proved and checked automatically:
  - 0–3 stages and a six-stage chain
  - sum and count
  - two filters in a row
  - map to a nested record, then filter, then map
  - u32 casts and comparisons
  - mixed exact arithmetic
- **Agreement with the reference runtime.** On random small tables, the logical
  pipeline and its decomposition both equal the reference runtime's keep value.
- **Rejection.** All of these are rejected:
  - evidence for another keep
  - a proof of something else
  - tampered definition bytes
  - a missing definition
  - stale evidence after the source changes
  - a projection definition that is not the instantiated one
  - an instance that skips interpretations or assumptions, or discharges an
    assumption with a wrong proof
- **Cast faithfulness.** Concrete casts are exact.
- **Builds.** `emit-state --prove-views` proves all ten keeps, and a wrong
  producer fails the build.

`inventory.lang` and `state-benchmark.lang` (u32 stock cast to Int) now have
checked views. Before this change they could not be row-modelled at all.

## Trust boundary

**Now checked:** the decomposition of each maintained view into row
projections, and every definition it uses.

**Still trusted:**
- the structural translation of each source lambda, which is the same
  translator as the row model
- enumerating a stored table as the logical row list
- native contribution lowering and the transactional cache protocol
- the Rust/LLVM backend

**Limits:**
- Exact integers in the logic are unary, so *concrete* kernel evaluation only
  reaches small values (about 40). Symbolic proofs are unaffected.
- A map whose result is a bare u64 and is then cast in a later stage
  (`map(r => r.b).map(x => Int(x))`) is not yet supported, because the cast's
  input is not row-valued. Use `map(r => Int(r.b))`.
- Joins and grouped aggregates are proved as mathematics in
  `knowledge/research/incremental-views`, but the source language has no
  operators for them yet.

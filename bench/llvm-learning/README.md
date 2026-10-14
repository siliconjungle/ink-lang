# LLVM learning development evidence

This records the first word-rule experiment, not general compiler superiority.
Runtime backends are fixed. Source/selection proof checking is separate from
profitability and all timings were taken on a shared machine.

## Browser scalar comparison

Three fresh Chrome processes ran 15 alternating baseline/planned pairs per case
after warmup, with varying inputs and consumed output checksums. The exact emitted
modules and rerunnable harness are in `scalar/`; raw samples and hashes are in
`scalar-browser-measurement.json`.

| Case | Median paired speedup |
| --- | ---: |
| `(x+y)-x` | 1.19x |
| Complementary mask merge | 1.18x |
| `(x&m)<=m` | 1.25x |
| Unchanged shift control | 1.00x |

These are development microbenchmarks of exported JavaScript functions. Harness
loads, calls and checksums are included; parsing, compilation and codec conversion
are excluded. They do not show an application-wide gain or a gain over Rust.

## Frozen planning corpus

`comparison.json` and the two reports compare the original 30,318-entry
publication with the 30,370-entry publication containing 52 new word rules.
The compiler and planner hashes match; the only producer-source difference is
enabling the new producer in the catalogue. The old snapshot also contained the
producer data, but neither its catalogue activation nor the canonical new entries.

Both runs compiled all ten programs, admitted 44 distinct laws, reused seven
across multiple programs, and selected alternatives in four programs. **None of
the 52 new word rules was admitted in this corpus.** The evidence therefore does
not establish wider applicability or a broader performance gain for this tranche.
Quick planning is bounded, so a missed rule is not proof of inapplicability.

Planning-time medians were approximately 14.00 and 13.91 seconds. These are debug
compiler diagnostics under contention, not evidence of a planning speedup.
An earlier candidate attempt hit a disk limit and then failed the compiler-hash
guard after a local rebuild; that attempt is excluded. The completed comparison
uses a preserved compiler executable.

## Generated discovery

Seed 831731 generates 32 programs before LLVM is consulted. The later analysis
version yielded 19 checked unique laws, with five unproved proposals; its manifest,
attempts and receipt are included. Eleven LLVM proposals were unchanged and eight
proposals duplicated another engine's suggestion. The remaining counts are
per-engine attempts, not disjoint sets of programs.

The manifest binds the authoring sources, executable compiler and executing Apple
clang 17.0.0. That compiler is distinct from the upstream LLVM source revision
`d977b4533f1d9b01d28cf4dba9b2db9d1ccfda08` being audited. Generated inputs are
development discovery evidence, not held-out generalisation data, and none of
these counts is a performance result.

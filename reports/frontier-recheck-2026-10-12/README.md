# Latest Ink versus Frontier: performance recheck

Latest local integration `5dcbf538` was compared with unchanged published
`@shapeshift-labs/frontier@0.1.9`. Published Ink main `dfaa35f9` and the previous
snapshot integration `62f63f63` are separate controls. This is a fixed-schema
workload of numeric arrays and five-u32 rows, not a general JSON benchmark.
The main counter compiles the same copied snapshot source; that main knowledge
checkout does not yet ship the snapshot library.

The longer-warmed JavaScript final-state comparison won all 18 row cases, with
Frontier/Ink median ratios from **1.28 to 26.53**. The lowest paired bootstrap
lower endpoint is 1.22. On fresh 16,384-row snapshots with about 1% changed rows,
Frontier took 3.32 ms and Ink 0.47 ms. With half the rows changed, the figures were
4.67 ms and 0.58 ms. With shared, unchanged rows, the margin was much smaller:
0.406 ms versus 0.316 ms. These are exploratory same-host measurements, not a
universal library ranking or a promise about arbitrary schemas.

## Complete warmed JS table

Times are median microseconds. **Final** returns the exact next logical state
without exposing patches; **roundtrip** explicitly produces and replays edits.
Frontier uses ordinary `diff` plus `applyPatchImmutable`. All timed calls consume
every field of every returned row. Input creation and freezing are untimed.

| Case | Frontier | Latest final | Previous final | Main final | Latest roundtrip | Fields | Frontier/latest final |
|---|---:|---:|---:|---:|---:|---:|---:|
| rows-64-unchanged | 38.44 | 1.45 | 1.52 | 15.34 | 1.99 | 1.42 | 26.53× |
| rows-64-sparse | 40.67 | 3.05 | 2.23 | 73.13 | 2.07 | 2.49 | 13.32× |
| rows-64-dense | 49.70 | 2.47 | 2.37 | 60.52 | 3.27 | 5.14 | 20.10× |
| rows-1024-unchanged | 216.30 | 21.87 | 21.66 | 205.83 | 30.68 | 20.70 | 9.89× |
| rows-1024-sparse | 274.14 | 28.61 | 29.45 | 679.72 | 33.18 | 30.08 | 9.58× |
| rows-1024-dense | 324.97 | 32.88 | 33.04 | 944.32 | 47.22 | 79.07 | 9.88× |
| rows-16384-unchanged | 2510.77 | 389.56 | 380.91 | 4192.23 | 561.29 | 387.27 | 6.45× |
| rows-16384-sparse | 3318.74 | 466.07 | 453.69 | 12521.54 | 572.54 | 484.89 | 7.12× |
| rows-16384-dense | 4665.19 | 575.05 | 641.11 | 17564.48 | 920.33 | 1693.03 | 8.11× |
| rows-shared-64-unchanged | 7.99 | 1.42 | 1.47 | 3.39 | 2.30 | 1.43 | 5.62× |
| rows-shared-64-sparse | 9.08 | 1.66 | 1.65 | 27.53 | 1.89 | 1.71 | 5.46× |
| rows-shared-64-dense | 29.20 | 1.98 | 1.95 | 46.07 | 2.80 | 4.42 | 14.78× |
| rows-shared-1024-unchanged | 64.89 | 18.00 | 18.03 | 42.53 | 28.37 | 17.95 | 3.61× |
| rows-shared-1024-sparse | 106.46 | 24.33 | 23.12 | 463.72 | 32.31 | 23.61 | 4.37× |
| rows-shared-1024-dense | 244.37 | 33.59 | 34.55 | 1020.47 | 51.08 | 84.85 | 7.27× |
| rows-shared-16384-unchanged | 405.70 | 315.81 | 335.39 | 1309.44 | 498.28 | 322.61 | 1.28× |
| rows-shared-16384-sparse | 1065.28 | 416.95 | 424.55 | 9785.46 | 557.90 | 450.23 | 2.55× |
| rows-shared-16384-dense | 3330.92 | 527.43 | 540.65 | 15794.38 | 775.68 | 1805.77 | 6.32× |

The compact field algorithm remains useful for preserving equal nested fields,
but adds work for these flat rows. At 16,384 fresh rows with 50% changes it took
1.69 ms, compared with direct reconciliation's 0.58 ms. All compact losses remain
in the table and raw samples. It is not selected automatically.

## Did JavaScript regress or choose the same algorithm?

For this exact source, the previous and latest JavaScript modules are entirely
byte-for-byte identical, SHA-256
`e0b2ac3d61ebe72e7a7d46f9e108c2fac8e6e39d053377f88b9898ab74a6b240`.
There is no code-generation regression in this comparison. Duplicate module
instances can have different V8 tiering and allocation histories. The broad
seven-round cross-backend run showed substantial variation even for identical
module bytes; that prompted the separately retained eleven-round JS control.
Do not attribute those differences to new compiler optimizations.

The automatic knowledge/planner run discovered candidates and admitted eight
roots, but applied zero laws. Estimated cost stayed at 866; no measured cost
model was loaded for this source. `selection.log.gz` and `selected.plan.json`
retain the full receipt. It did not benchmark alternatives and choose the fastest.
Most later changes concern maintained state, indexing and transaction machinery,
which this ordinary list-snapshot workload does not exercise.

## Backend boundaries and losses

The broad run has 27 fixtures: 64/1,024/16,384 elements, unchanged/about-1%/50%
changes, scalar/fresh-row/shared-row values. It measures diff, hints, replay,
roundtrip and final-state reconciliation separately. Diff outputs have different
patch formats; compare those timings with that output-contract difference in mind.
No format equality or general wire-protocol replacement is claimed.

The current ordinary diff/apply module uses packed C/Wasm calls. The generic
reconciliation module uses the complete-state Wasm host and its logical JSON
boundary; exact native integers are materialised as u32 Numbers within each full
call. Captured-input packed Wasm excludes initial capture and returns an owned
packed copy; it is a separate boundary. Typed Rust includes owned input Vec
clones and full output digests, with JSON parsing outside the timer. Its process
is separate from Frontier and receives no paired confidence interval.

The following examples show every relevant boundary, in median microseconds:

| Case / operation | Frontier browser JS | Ink browser JS | Full Wasm | Captured Wasm | Full GPU | Resident GPU |
|---|---:|---:|---:|---:|---:|---:|
| scalar-16384-sparse / diff | 341.56 | 188.13 | 1125.63 | 26.60 | 8210.00 | 6430.00 |
| scalar-16384-sparse / hint | 11.87 | 9.77 | 1153.75 | 8.92 | 2181.25 | 766.25 |
| rows-16384-sparse / diff | 1991.25 | 250.78 | 9175.00 | 72.19 | 16070.00 | 7430.00 |
| rows-16384-sparse / hint | 20.21 | 16.12 | 9560.00 | 43.32 | 11280.00 | 981.87 |
| rows-shared-16384-unchanged / diff | 206.41 | 260.31 | 10250.00 | 51.76 | 18885.00 | 8080.00 |

For the 16,384 fresh sparse-row diff, captured Wasm is fast at 72 us; the full
logical call takes 9.18 ms. Full GPU takes 16.07 ms, resident GPU 7.43 ms, and
Frontier's browser diff 1.99 ms. Residency removes uploads but not dispatch,
serial graph stages or readback/output construction. The result does not support
a GPU speedup for this workload. Buffer replay and generic reconciliation remain
GPU-ineligible and are recorded as such, never timed through fallback.

Typed Rust final-state reconciliation completed all 27 fixtures correctly.
For `rows-16384-sparse`, its median was 202.78 us.
For `rows-16384-dense`, its median was 245.25 us.

This is useful native performance evidence, with a different host boundary from
Frontier JS. The complete cell tables, ranges and same-process bootstrap ratios
are in `summary.json`; no backend losses are omitted.

## Generic Wasm: a pre-existing scaling defect

Both latest and previous complete-state Wasm failed to finish the same
16,384-row sparse reconciliation call within a **30-second external deadline**
after module instantiation. Neither probe produced a completed reply, so neither
is a correctness pass or a warm timing sample. Four large changed-row generic
Wasm cells are excluded from the matrix under this budget and retained as
explicit exclusions. The unchanged large cases and smaller cases remain timed.

A benchmark-only control moves `length(before)` outside the loop. It completed
the same full call in **364.45 ms**, with an exact result and full digest. This is
a first-call diagnostic, not a seven-round speed estimate or a universal proof.
Production source, knowledge and lowerings were left unchanged. The three probe
receipts retain deadlines, boundaries and result status.

The emitted C loop calls `ink_op(...,"list_length",...before...)` once per row.
The generic native bridge fetches operands using `InkContext::value`, which
clones the underlying `V`. `V::List` owns a Vec, and its record elements own maps
and strings, so this clones the whole previous list before reading its length.
That gives quadratic copy work. Direct `ink_length` and `ink_item` already read
through borrowed collection handles; this problem is the generic primitive route.
The same cloning path exists in the previous native support. The matched probes
therefore establish an existing slow path, not a newly introduced regression.

The machinery fix belongs in the compiler/native primitive bridge: borrow for
read-only operations and emit suitable borrowed reads. Knowledge can also prove
and select loop-invariant hoisting, but avoiding a repeated length read does not
make an individual generic read efficient. JavaScript alternative selection
separately needs appropriate source candidates and applicable cost evidence.
See `diagnostic-sources/` for both native bridge versions and the emitted loop.

## Protocol, validation and reproducibility

All inputs are frozen and logical results are checked against independent
fixtures before and after timed batches. Each timed call contributes its complete
output digest. Candidate order is randomized per round. The broad run has seven
rounds with 5 ms calibration; the dedicated JS run has eleven rounds with 20 ms
calibration and 256/96/24 warmups for its three sizes. The main controls compile
the same source rather than receiving favourable precomputed answers.

The browser run uses an actual Apple Metal-3 adapter. All 122 GPU cells have
positive dispatch counts; resident cells have zero uploads. The audit checks
exact case/candidate/round coverage, actual GPU execution and budget exclusions.
These checks are conformance evidence, not backend correctness proofs.

| Run | Cells | Samples | Rounds | Actual GPU cells |
|---|---:|---:|---:|---:|
| node-results | 954 | 6678 | 7 | 0 |
| browser-results | 1076 | 7532 | 7 | 122 |
| native-results | 142 | 994 | 7 | 0 |
| node-focus | 126 | 1386 | 11 | 0 |

Timing processes ran serially after compilation and validation. An initial timing
attempt briefly overlapped validation and was discarded before saving a result.
Two early validation attempts exposed only harness issues—native integer output
and record-key order—which were corrected before the final matrix. A shared
machine and short rounds still limit precision; other local work was not forcibly
stopped. Cross-run absolute times should not be treated as paired comparisons.

`cohorts.json` records the start revisions, package pins and compiler hashes.
`provenance.json` binds exact harnesses, inputs, generated modules, receipts and
the measured artifact archive. The archived programs were generated literally
from checked source; the automatic selected JS is also retained with its zero-law
receipt. `artifact-manifest.json` hashes each archive member. Rebuilt probe
compilers use the same frozen source/package revisions but separate target folders.

Unpack `measured-artifacts.tar.gz` at an isolated distribution root, use the
committed benchmark drivers and write fresh result paths. Rebuild the archived
native Rust source/manifest/lockfile in release mode to reproduce its driver.
See [the harness guide](../../bench/frontier-recheck/README.md). Keep the saved
observations unchanged when replaying.

# Final-state snapshots: implementation and JavaScript timings

All four changes are available: immutable element sharing in owned JavaScript
collections; typed equality with identity fast paths; a fused select-before-build
collector and a checked database rewrite; and generated compact field updates.
The new public functions return final logical values. Their update buffers and
field tags remain private. See [the implementation guide](../../docs/internal-snapshots.md)
for the host ownership contract and proof limits.

## What was measured

Node v26.1.0 on Apple M2, Darwin arm64, macOS 26.5.2. This is a same-process,
whole-call comparison over 18 frozen equal-length lists of five-u32 records:
64, 1,024 and 16,384 rows; unchanged, about 1% changed and 50% changed; fresh and
shared unchanged rows. Every timed call includes a digest of all five fields of
every returned row. Input creation, freezing and fixture loading are excluded.

Seven rounds use a deterministic randomized candidate order, three warmup calls
and per-cell calibration targeting 15 ms, capped at 1,024 calls. Results are
exploratory measurements on a shared host. Some small cases show tiering/noise;
all raw samples and paired bootstrap intervals are retained. These measurements
do not establish native, Wasm, GPU, general JSON or stored-state transaction speed.
Ink knows this fixed schema; Frontier is the unchanged published general-purpose
`@shapeshift-labs/frontier@0.1.9` package. No patch-format equivalence is claimed.

Columns below are median microseconds, including the full output digest:

- **Old apply / shared apply:** identical explicit row-edit replay, old/new lowering.
- **Old roundtrip / new lowering:** identical source diff plus replay, old/new lowering.
- **Final state:** the new generic snapshot reconciliation library.
- **Fields:** generated private compact field updates followed by replay.
- **Frontier:** ordinary `diff` plus `applyPatchImmutable`.

| Case | Old apply | Shared apply | Old roundtrip | New lowering | Final state | Fields | Frontier |
|---|---:|---:|---:|---:|---:|---:|---:|
| rows-64-unchanged | 44.64 | 1.28 | 183.60 | 3.50 | 2.61 | 2.67 | 69.44 |
| rows-64-sparse | 48.98 | 2.34 | 198.76 | 121.53 | 3.69 | 7.02 | 75.46 |
| rows-64-dense | 76.60 | 2.23 | 81.04 | 5.64 | 3.60 | 8.48 | 91.28 |
| rows-1024-unchanged | 783.52 | 20.01 | 855.82 | 57.73 | 39.61 | 41.01 | 430.05 |
| rows-1024-sparse | 775.98 | 20.36 | 848.46 | 56.59 | 50.10 | 52.48 | 481.94 |
| rows-1024-dense | 1145.83 | 31.08 | 1225.02 | 69.08 | 51.02 | 121.32 | 540.21 |
| rows-16384-unchanged | 12171.37 | 300.36 | 12052.83 | 827.79 | 569.14 | 569.61 | 3856.64 |
| rows-16384-sparse | 11402.88 | 294.74 | 11846.21 | 898.74 | 709.27 | 718.73 | 5383.92 |
| rows-16384-dense | 15989.67 | 496.24 | 16006.54 | 1113.50 | 747.56 | 1941.94 | 6498.29 |
| rows-shared-64-unchanged | 43.32 | 1.27 | 48.47 | 3.21 | 2.22 | 2.17 | 11.73 |
| rows-shared-64-sparse | 48.77 | 1.39 | 49.95 | 3.94 | 3.39 | 3.56 | 19.51 |
| rows-shared-64-dense | 68.42 | 2.15 | 203.84 | 5.36 | 3.69 | 7.39 | 55.88 |
| rows-shared-1024-unchanged | 654.03 | 19.13 | 699.80 | 59.02 | 37.36 | 37.03 | 149.02 |
| rows-shared-1024-sparse | 627.65 | 17.65 | 662.41 | 57.28 | 41.96 | 44.35 | 189.96 |
| rows-shared-1024-dense | 925.01 | 26.61 | 944.49 | 62.51 | 44.88 | 87.82 | 312.40 |
| rows-shared-16384-unchanged | 11970.33 | 294.27 | 12217.65 | 917.26 | 575.58 | 566.99 | 686.05 |
| rows-shared-16384-sparse | 13194.83 | 348.66 | 15102.00 | 1158.68 | 747.79 | 816.87 | 1883.02 |
| rows-shared-16384-dense | 17962.96 | 581.75 | 18596.92 | 1487.52 | 845.22 | 2147.57 | 4946.01 |

## Interpretation

Across this suite, final-state median times were 14.7–70.2 times lower than the
old Ink diff/replay path and 1.19–26.6 times lower than Frontier's roundtrip.
Those are observed per-case ratios, not a general library ranking. The closest
Frontier case is the 16,384 shared, unchanged rows: 575.58 versus 686.05 us.
`summary.json` includes all per-case ratios and paired bootstrap intervals.

The same-source controls show that shallow owned slots and typed equality help
without rewriting the algorithm. The final-state library also avoids creating a
patch list just to consume it again. Both distinguish the execution improvement
from choosing different source code. Digest work is included in every column.

Compact field updates are often slower for these flat rows, particularly at 50%
changes. Direct reconciliation can retain an already available immutable `after`
row; field replay constructs updates and a new row. A separate physical test
verifies its benefit for nested data: when one field changes, equal nested fields
retain the previous objects. This suite does not measure that nested workload.
The compact algorithm is available and checked; it is not forced by the planner.

The installed select-before-build producer discovers an ordinary universal list
law. An explicitly selected package passes proof checking, backend conformance
and a test that rejected records never read their build-only field. In the
unprofiled automatic search, the structural costs tie at 94, so the planner keeps
the baseline with zero applications. `automatic-selection.log.gz` and
`automatic-selection.plan.json` retain this result. Unknown predicate selectivity
is not replaced by an invented profitability claim. The fused `collect` library
entry is directly usable regardless of that search choice.

## Correctness evidence

The four snapshot tests pass complete C, Rust, JavaScript and both Wasm
comparisons against the independent reference. They cover append/truncate,
empty input, duplicates, heterogeneous nested fields, IDs, signed zero and NaN
payloads; immutable row/field identities; invocation-local conversion; eager
literal comparison; and state input capture plus detached replies/outbox views.
Public calls to private owned-buffer helpers are rejected. Rehashed false-field,
false-predicate and missing-ID-context proof mutants are rejected.

The select-before-build test also passes required actual native WGPU execution.
`webgpu-conformance.json` records five browser GPU calls with exact values,
positive dispatch counts and no fallback. Its manifest matches the final emitted
bundle. Owned snapshot replay itself is a CPU algorithm. Independent core and
JavaScript-package suites, source law authoring and the native owned-buffer
sanitizer test pass. Logs are archived alongside the results; tests remain
conformance evidence rather than backend correctness proofs.

## Reproduction and provenance

`node-results.json` retains 882 timing samples and 126 validated cells.
`summary.json` is derived by the committed `summarise.py`, which checks complete
case/candidate/round coverage. `provenance.json` records hashes, base revisions,
independent package pins and the new knowledge/lowering commits.

Unpack `measured-artifacts.tar.gz` at an isolated repository root. It contains
the exact old/new generated JavaScript, input fixtures, published npm package,
source selection and eligible browser GPU bundle. The archive manifest hashes
every member. The measured source modules were rebuilt after finishing the
implementation and matched byte for byte. Then follow
[the harness instructions](../../bench/internal-snapshots/README.md) and write
new results to a new path; do not overwrite the saved observations.

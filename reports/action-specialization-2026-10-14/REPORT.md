# Native maintained actions — 14 October 2026

Follow-up: [checked planner selection](../planner-reliability-2026-10-14/REPORT.md)
resolves the original checker-timeout run below using optimized checking, large
sealed prefix reuse, and independent lifecycle selection on two state programs.

Ink now emits direct bound action calls, typed table primitives, native scalar
maintenance definitions and root-specific view preparation. Database-authored
whole-action equalities admit one upsert instead of contains/replace/insert and
move a parameter-dependent failure return ahead of mutation and event staging.
The compiler consumes those admitted bodies literally. General helper-equivalence
induction lemmas preserve unchanged query proofs when generated lexical names shift.

Views also admit optional universal scalar update and complete contribution choices.
The kernel rechecks signatures, exact source binding and every equality. Counts can
therefore drop zero multiplication, and replacements use fused wrapping arithmetic.
The native lane removes private constructor codecs and recursion wrappers, carries
bounded modular intermediates and normalizes at observable arithmetic boundaries.
Unsupported carriers or recursion retain the ordinary literal lane. This does not
constitute a compiler-correctness proof; native controllers, codecs and lowering
remain trusted. Whole-action equality excludes resource exhaustion.

Single-cell actions defer maintenance until a keep read or successful commit. They
leave committed caches untouched before publication. A failed path with no keep
read performs no maintenance; a staged read evaluates only its requested view.
Host/multi-cell transactions retain journals. First-event staging uses scalar slots.
Parameterless subscriptions use direct calls and immutable scalar publication skips
redundant ownership/conversion codecs. Composite copies and error isolation remain.

## Matched measurements

All numbers below are microseconds for a synchronous update plus two aggregate
reads, an awaited equivalent, or a connected update. Three fresh processes each
compare before/current artifacts on identical input histories with a shared-body
20,000-call warmup, seven retained rounds and alternating lane order. Both sides
use the same core epoch and portable seed; before emission uses JavaScript
`ae06c9d2`, and current emission uses the admitted composed source and maintenance
choices. Cold setup/restore are excluded here and handled by lifecycle acquisition.

| Implementation | Phase | Before median | Current median | Median within-process ratio |
|---|---|---:|---:|---:|
| Ink maintained map | awaited-update-and-aggregate | 6.112 | 3.216 | 0.634 |
| Ink maintained map | sync-observed-update | 2.167 | 1.700 | 0.785 |
| Ink maintained map | sync-update-and-aggregate | 2.254 | 1.118 | 0.509 |
| Ink dense prefix | awaited-update-and-aggregate | 6.407 | 3.852 | 0.777 |
| Ink dense prefix | sync-observed-update | 2.132 | 2.046 | 0.753 |
| Ink dense prefix | sync-update-and-aggregate | 1.929 | 1.395 | 0.733 |

The median paired change is about 49% less time for maintained maps and 27% less
for dense prefixes on the synchronous update/read workload. Connected updates
improve about 21%/25%. Unchanged reads show no established improvement.
One map process reverses the update result (5.143 us versus 2.254 us), while the
other two improve to 0.939 and 1.118 us. Host/process variability remains large;
these observations do not establish statistical confidence or an across-workload
speed guarantee. The manual Preact commits/events control still wins overall on
this hot action. It does not implement general source transactions or portable
restore; connected consumers also have different callback contracts. No DOM or
framework rendering is measured, and no framework superiority is claimed.

## Correctness and publication

The state suites cover exact reference histories, full-width wrapping, insertion,
deletion, nested failures, staged keep reads, host rollback, corrupt restore,
portable snapshots, subscriptions, ownership and commit-sequence exhaustion.
Forged update/contribution/factorisation/replacement proofs reject admission.
Instrumentation verifies zero maintenance on an aborted single-cell path without
keep reads and only the requested view on a staged read. Native arithmetic checks
42,025 input pairs, including comparison/division normalization and unsupported
operator/recursion fallback. Whole-action tests reject a competing earlier failure,
a forged return and an out-of-scope local predicate; source admission rejects an
effectful key being reused as a presence fact.

The complete JavaScript suite includes sum-layout ownership/transaction/wire
coverage. All 177 planner tests and the affected knowledge suites pass. Required
parity compares C, Rust, JavaScript and both Wasm backends against the independent
reference, including exact snapshots, and exercises an actual required GPU call.

An intermediate knowledge merge was accidentally published with conflict markers
when a failed Python command did not stop its shell. It was repaired immediately
by an authenticated union of both snapshots, preserving all 28,730 entries. Final
publication validation explicitly parses the registry/pointers, rejects conflict
markers and checks the union membership. Immutable historical objects are retained.

Raw process results, exact compressed artifacts/plans, fingerprints and validation
logs accompany this report. Mathematical admission, implementation conformance and
performance observations are separate evidence.

The frozen held-out corpus audit attempted `index-membership` with the current
installed registry and a private knowledge copy. It exceeded its 180-second
compilation bound; no admission funnel or new cross-program selection claim follows
from that attempt. The differently named `Price` schema in action conformance does
admit the single-upsert rewrite with checked helper bridges, but it is a correctness
fixture, not held-out profitability evidence. Standalone runtime dependency
resolution passes with all transitive lowering/core revisions aligned.

Planner checker transport now uses a bounded binary receive buffer and nonblocking
request writes under one deadline. Waiting for a newline after a partial response
or writing a request to a checker that stopped consuming input cannot bypass that
deadline. Regression tests cover both hangs and exact large/multiple responses.
Compiler stderr is discarded by this protocol, whose checked errors arrive in JSON.

The bounded automatic maintenance-only selection run checks three proposals but
admits only the baseline under a 30-second per-check budget. Its independent
lifecycle acquisition and held-out traces validate that retained baseline. This
run does not demonstrate automatic selection of the faster implementation; the
explicit composed packets used in the paired benchmarks separately pass replay.
The receipt and its rejection reasons are archived rather than interpreted as a
profitability loss.

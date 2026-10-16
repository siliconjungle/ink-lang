# Guarded U32 variable remainder and bounded proof transport

This batch adds one database pattern and reduces repeated proposal-view Merkle
metadata. Core, primitive meanings, backends, ABI, runtime, source/proof budgets
and selection policy are unchanged. Source pins and every raw measurement keep
their original contexts. This is not an exhaustive V8 review or whole-compiler
speedup claim.

The new 341st integer root proves
`rem_or(x,y,default)` equals a strict binding of `x` then `y`, followed by a mask
when `y != 0 && (y & (y-1)) == 0`, otherwise the original remainder. Defaults remain
lazy. It covers all 32 powers, including the top bit, zero, all other U32 divisors
and full-width numerators. Signed/U64 variable divisors remain open. All340
previous root proofs retain their exact identities.

The ordinary proof composes 32 constant witnesses through exhaustive `Cases`,
scoped `AssertEquality`, normalization and one bounded terminal bitvector fact.
Existing equality-assisted authoring gives smaller complete witnesses for powers 23
and24; the other 30 retain packed existing constant proofs. The root is 49,454
bytes, with 35 independently checked objects in its closure. No hash, index,
case name, profile or measurement grants authority.

Near-limit proposal views now lazily use two-entry Merkle leaves; ordinary
requests retain the previous64-entry topology. The same source, proof bodies,
dependencies and source applications produce a16,031,589-byte selection with
64-entry leaves, rejected at the existing source input limit. Compact leaves give
15,970,479 bytes; the complete15,970,653-byte plan passes ordinary checking.
`boundary.py` reproduces that exact difference. This is a capability boundary,
not a successful-check timing comparison; a larger source can still exceed the
unchanged limit. The compact-membership regression checks exact closure,
external supports, authenticated replay, membership tampering and false equations.

## Complete-call runtime controls

The source is an ordered wrapping U32 fold with a changing divisor, a lazy
fallback and an observed cohort. Two disjoint typed splits cover powers,
nonpowers, zero-divisor defaults and empty calls. CPU acquisition uses three
fresh processes, 11 rounds each, independent original-source oracles and complete
result consumption. JavaScript uses the compact boundary. All four CPU
comparisons (initial and zero-first variants, JS and Rust) retain the baseline
under the existing mixed-profile10% gain/extrema guard.

The initial GPU control uses three fresh browser/device processes per split,
actual nonfallback hardware, observed dispatch/submission/readback counters,
full results and the original-source oracle. Held-out power process medians are
1.77375ms baseline versus 1.51ms guarded, median paired ratio 1.17399; only one of
three held-out processes passes the 10% extrema guard. Zero-divisor medians worsen
from 1.21875ms to 1.735ms. Nonpower costs and every raw process remain visible.
No automatic GPU selection, CPU placement, cold-call or broad performance claim
follows. Build/loading are separate, peak browser/device memory is unknown, and
the shared host concurrently runs required validation.

A separate ordinary zero-first prototype returns the lazy default directly on a
zero divisor. Its36-object proof and complete plan pass the same checker and
limits. A paired three-plan GPU rerun includes baseline, initial guard and that
prototype: held-out power medians are 1.73/1.4925/1.72625ms; zero medians are
1.21/1.7525/1.200625ms. Thus the prototype removes most of the zero regression but
loses the initial power gain. It remains a selected proof/performance baseline,
not an installed discovery root in this batch. CPU mixed-profile selection also
retains the baseline. These alternatives must not be collapsed into a universal
profitability claim.

The 282 immutable observation proposals contain 192 CPU and 90 explicit-device
rows, 11 rounds per process/phase/candidate; none is a proof premise or profile
policy change. `runtime-summary.json` distinguishes the median of process
medians from the median paired ratio.

## Proof and reproduction

Focused tests cover strict operand work, genuinely lazy defaults, every divisor
power, nonpowers, zero and exact high-bit values. Literal baseline/selected JS and
Rust-Wasm each match 19 independent full-result calls, including a 228-case mapped
input; arbitrary-precision host word representations normalize only within the
exact U32 range. The initial conformance harness compared BigInt with Number;
its failure and the corrected, range-checked final run are retained. No compiler
or source fix was needed for that harness mismatch.

`author_cases.py`, `author_quotient.py`, `combine.py` and `refine_zero.py` retain the
bounded untrusted proof-authoring methods; cached selected proof inputs are in
the reproduction archive and canonical published laws live in pinned knowledge.
`prepare.py`, `prepare_refined.py`, `measure.py`, `conformance.py` and `boundary.py`
reproduce checked source/plan/control work using the selected frozen compiler.
Use `PYTHONPATH=knowledge:planner` and the declared `build/proof-python/bin/python`.
A fresh scratch directory is required for authoring/acquisition; these scripts do
not establish automatic profitability or replace ordinary checker replay.

## Published-binding database index

The first required corpus completed all ten programs but found alternatives for
only two, admitted five old laws, reused none across programs and selected no
alternative. The eight other programs exhausted quick search before any semantic
receipt. Its unfavorable results remain in `../corpus-variable-power-initial`;
its25.5035-second median is not a compiler speedup. Profiling the first source
finds no integer-library match and only five generated proposals, so the large
guarded proof does not explain that program's lost coverage.

An independent layout/CLI control admits8/0/0 edges in the wide-final,
compact-final and compact-previous-CLI runs. It exposes a tight scheduling window,
not a reliable causal layout comparison. Published-package source-binding
discovery was spending most of that window authenticating180 unrelated package
bodies to build a missing per-snapshot sidecar. A profiled pass takes13.3s;
unprofiled controls and exact input/metadata hashes remain separately recorded.

The database now derives versioned per-entry source bindings during ordinary
canonical index rebuild/refresh. A complete summary joins against pinned snapshot
membership and avoids reopening unused bodies. Missing/legacy/incomplete summaries
retain the existing scan fallback. The canonical consumer rechecks kind and source;
wrong SQL keys cannot admit a different source or an invalid equality package.
This is untrusted discovery metadata, outside core and every proof premise.

Three fresh processes return identical180-binding results with median4.8692s and
180 body opens for the legacy scan versus0.023128s and zero body opens for the new
lookup. The selected private-index migration costs8.0312s; preparing the installed
root costs7.9817s and leaves the proof snapshot unchanged. That preparation is
explicit work before bounded search, not free cold compilation. The64 index,
publication, recovery/concurrency, discovery and adversarial regressions pass in
25.095s. The initial31-method proof suite and three focused methods retain their
original pre-index source context; no core/proof body changed in this refinement.

A complete single-program control with the new index still admits no edge in its
quick window: other early recipes and shared-host scheduling remain a broader
coverage gap. The metadata improvement alone does not establish robust global
search coverage, compile-time speed or application runtime speed. The final
required ten-program corpus reports its own unchanged quick budgets, funnel,
near misses and source context separately.

The runtime controls use knowledge `bc39af9624fdcc6450b53e4269aea2a3defd7ba9`
(the checked guard and compact transport before the SQLite refinement). Historical
measurement contexts and costs are not relabelled to the later producer code.


## Adaptive transport and final index validation

Full semantic-search profiling exposed the cost of eager compact transport:
17 catalogue refreshes constructed49,783 tree nodes. The final policy retains
ordinary64-entry leaves and builds a compact alternative only for a requested
packet near the existing entry/source envelope limit. It uses the alternative
only when smaller. On the2,049-candidate metadata control, the initial eager
layout writes3,536 tree files versus127 for the ordinary layout. This is an
explicit untrusted transport control with unused dummy candidate identities;
unused bodies are never exported or admitted. The real35-object remainder proof
and its global-noise control remain byte-identical to eager compact packets.
The prototype timings and subsequent repeated controls retain separate receipts.
In the final complete construction/bundle/export control, three fresh processes
per arm give ordinary-packet medians 1.81819s eager versus 0.07397s adaptive.
For the real near-limit closure with 2,048 unused catalogue identities, medians
are 3.15568s versus 2.57861s; every exported byte and hash matches. Adaptive
large-packet assembly builds both topologies and writes 3,683 tree files versus
3,556 eager files. Its bundle phase alone is slower; the complete measured
assembly improves. No peak-memory, whole-compiler or application gain follows.

The final bundler authenticates and sizes each canonical object once, retaining
the same two view-wrapper levels in its nesting budget. Exact outer metadata
accounts for the remaining bytes; it does not weaken canonical validation or
raise cache/file/proof limits. The fourteen focused tests and twelve composition,
conditional-adapter and transport regressions pass; the canonical depth test was
moved into the knowledge package, leaving planner source and its pin unchanged.
A fresh complete source-plan replay also reproduces the original exact plan bytes.

The lookup index additionally covers `(kind,id)`. On the retained exact relational
fixture, three fresh-process15-query batches have medians196.01ms before versus
5.52ms after. An independent VM-instruction pass falls from a bounded
3,732,600–3,734,085 instructions to16,400–17,885, with every ordered/paginated
result identical. One indexed process takes39.92ms; the full process values stay
visible. These are database-query controls, not application or whole-planner
speedups. The modern in-place index upgrade takes2.927s and leaves mathematical
membership unchanged.

Sixty-six publication/index regressions cover legacy migration without a database
copy, pinned historical membership, pagination, malformed optional metadata,
wrong cached source/kind hints and an authenticated false equality package. The
original query-control measurements retain source `b4021e84c1645207965e22b0ca8f8c6d889ececa`;
the subsequent hardening/kind-index changes have their own source receipt. The
100MB relational input is retained once as a16MB compressed projection of the
five required cache tables, preserving rowids and indexes. Its180 canonical
package inputs remain referenced through the protected immutable source snapshot;
no full knowledge checkout or build target is copied into that fixture.

`discovery-controls.json` retains all six query batches and twelve transport
processes. `discovery-controls.tar.gz` contains the source-profile diagnostics,
component receipts, prototype and exact eager implementation, plan byte-parity
receipt and 66/14/12-method logs; its hash index authenticates every file.
`audit_discovery.py` checks these sources, the compressed relational fixture,
all four corpus outcomes and the checked-plan byte parity. `audit.py --replay`
also replays both selected proof plans with the pinned compiler. Both auditors
check historical source hashes in Git rather than relabelling measurements to
the final code.

For fresh component reproduction, decompress `binding-fixture.sqlite.gz` once
outside a measured interval. Use that exact database for `measure_bindings.py`
and `measure_kind_queries.py`; the latter's indexed arm differs only by
`CREATE INDEX entry_kind_lookup ON entries(kind,id)`. Required package bodies
remain in the declared canonical store/snapshot. Restore
`adaptive-transport/eager_views.py` from the discovery archive under
`build/v8-variable-power-cases`, then run `measure_transport.py` in fresh Python
processes for both cases and variants with distinct process numbers and fresh
output directories. Preparation and filesystem/cache state are explicit context;
these controls do not establish cold compiler or application performance.

The final adaptive frozen cohort compiles all ten programs, finds alternatives
for all ten, admits 25 laws and reuses six across programs. It selects no
alternative or representation: every final gate still requires measurement
evidence and every quick search exhausts its time budget. Its median is
50.7305s, excluding preparation; shared-host durations and cross-cohort funnel
changes are not a causal compiler-speed comparison. All earlier eager/indexed
cohorts remain retained. A separate merged-main integration follows with its own
compiler/core/package identities.

## Merged-main integration

The separately rebuilt merged compiler is
`31925a41d50962dc385248ac5c03b93e46587bda38f96997ee4af64d2beb6027`,
from distribution `2f6f164e058e8aa450de37af8314e7dd1b0f442a` and knowledge
`1c6e117b07b7283218f902801f5472652f89f16b`. It preserves upstream core
`d5b69b52c3761a7e1d21dd02971cef37cb2b0425` and standalone package
`c13434ded048ef948c8f74396ddc238b72c8700c`. All 227 current core files match
the retained upstream 486-test receipt; those tests were run upstream. The local
locked build uses the identical upstream resolution lock, debug0/incremental0
and two Cargo jobs. Historical cost observations keep the earlier ed3 compiler.

The 31 intended proof tests are all covered successfully. The first combined
run took 716.971s and reported one setup error because a copied frozen executable
lacked its execute bit; its other 30 methods passed, and the affected method
passed separately after correcting the mode without changing image bytes.
Both logs and the complete expected inventory are retained. The 72 separate
index/publication/upstream integration methods pass in 46.003s. Fresh literal
JS/Rust-Wasm baseline/rewritten lanes each pass all 19 complete-result calls.

Both full GPU artifact trees are byte-identical to the historical measured
images: 34 files per plan, including complete shaders, hosts and CPU Wasm.
Twelve actual nonfallback GPU calls cover powers, nonpowers and zero defaults
across both splits and plans. Independent dispatch/submission/readback counters
and complete source-oracle results pass. Six uniquely retained current source
oracle receipts also match the historical raw receipts exactly; the original
GPU runner reused a receipt label between phases, so these independent replays
retain each split/phase separately. The corrected reproducing runner now uses
unique labels. Both the installed guard and zero-first prototype plans replay
under the merged kernel. These are finite conformance checks, with no new cost
observations, automatic selection or timing transfer.

The final stable merged corpus compiles all ten programs and finds alternatives
for all ten, with 23 law identities and six reused across programs. Those 23
identities are a subset of the preceding adaptive cohort's 25. It selects no
alternative or representation: all ten final gates require measurement evidence,
and all quick searches exhaust their time budgets. Median planning duration is
51.3645s excluding preparation; this unpaired shared-host cohort is not a causal
speed comparison. Its complete context and unfavorable differences are retained
in `../corpus-variable-power-merged`.

`merged-validation.json` records these distinct source/test/device scopes;
`merged-inputs.tar.gz` retains new receipts and controls. Its index references
132 exact source/plan/emitted-image files in the existing selected archive rather
than copying identical revisions or generated targets. `audit_merged.py` checks
all sources, archives/references, test coverage, complete image hashes, counters,
oracles and final corpus context. `validate_merged.py` and `replay_merged.py`
reproduce the finite device and kernel/oracle checks. Initial setup logs are
retained; no failed setup is represented as a passing combined test run.

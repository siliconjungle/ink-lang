# Frontier state and JSON evidence, 13 October 2026

The all-metrics target remains unmet. Read-heavy state and retained JSON editing
win in these fixtures; row updates, conversion and message decoding still lose.
This is a shared development host, not a controlled laboratory.

## Matched lifecycle and retained footprint

`lifecycle-cohorts-167-169.json` binds distribution `d3d8284e`, ABI `49ea093` and
JavaScript `f720ae2`. Each cohort runs eight independent fresh processes in
alternating library order, with capability-specific imports. State initialization
uses the unchanged source-observation adapter extracted from `run.mjs`; an exact
source comparison and mixed-state smoke preflight preserve full replies, rollback,
versions, events and snapshots. The final harness/source/module snapshot is in
`artifacts/lifecycle/`; earlier diagnostic epochs remain separate.

| Retained boundary | Ink | Frontier |
| --- | ---: | ---: |
| 32 owned 512-field JSON trees, GC heap delta | 3,815,360 B | 790,608 B |
| 4096 live rows, acknowledged events, GC heap delta | 3,241,984 B | 838,672 B |
| 32 complete portable document backing buffers | 727,904 B | 179,840 B |
| 32 complete agreed-schema document backing buffers | 227,872 B | 179,840 B |

The owned-tree/live-state heap ratios are 4.83×/3.87× in these fixtures. Portable
and compact buffers have distinct protocol/observation contracts; compact requires
out-of-band schema agreement. These are independently owned buffers, with exact
backing sizes, not estimates derived from a negative GC external-memory delta.

Median capability-specific import times are 5.541/1.355 ms for Ink/Frontier JSON
trees, 5.397/11.370 ms for state, and 5.363/7.700 ms for portable buffers. Per-row
live-state initialization, including conversion/reply assertions/acknowledgement,
is 14.761/4.422 ms. Retaining 32 parsed trees is 5.506/2.304 ms; portable buffers
13.687/8.877 ms; compact buffers 24.598/8.751 ms. Compact construction currently
does logical parse then encode, explicitly unlike portable streaming emission.
Imports, codec/state construction and first use are retained as separate phases.
No new steady-state speed claim follows from these setup diagnostics.

Median peak RSS measured before output verification is about 85.5/70.0 MB for
owned trees, 83.0/72.5 MB for state, 82.3/73.1 MB for portable buffers and
83.1/73.0 MB for compact buffers (Ink/Frontier). Whole-process high-water values
are also retained. Runtime, harness, warmup and JIT memory are included; forced
GC samples are not exact allocation counts or statistical peak bounds. Initial
small-buffer external deltas were negative, which is why exact backing bytes are
reported independently. These measured lifecycle gaps, especially live datatype
storage, are now explicit optimisation targets. They do not establish universal
ratios or an all-metrics victory.

## Bound child readers

Record/sum reading dominates the sampled message-decode profiles. The selected
ABI change separates reading bodies from checked node entrypoints and binds a
single-field record's child reader directly. Both node/depth charges and both
portable frame-end checks remain in their original order; child values are
constructed before their parent. No schema budget, Unicode/tag check or source
algorithm is removed. This is fixed typed ABI lowering, not a database theorem.

Three paired processes give median portable/compact message decode speedups
of 1.355×/1.099× against the schema-resource release. The numeric-list control
improves 1.845× portable and 1.620× compact. This control does not use the
record fast path; the refactored binding/read function organisation affects its
execution too. Wider-record, recursive numeric and encoding results vary and are
retained rather than interpreted as universal gains. The complete binary editing
diagnostic improves 1.073× in one process; that is not a release ranking.

A generic iterative unary-chain reader regressed compact messages (0.779×)
and recursive numeric portable decoding (0.615×) and is rejected. All modules,
sources, harnesses, profiles and raw results are retained under
`artifacts/wire-child-reader/` and `wire-child-reader-summary.json`. Timed codec
controls use shallow consumers with complete-value preflight; sampled profiles
are diagnostics, not benchmark evidence. Full ABI and mandatory JSON/state
suites passed, including every supported child shape under a prototype-key
record, frame mutations, lowered budgets, exact snapshots, rollback and
forged-proof rejection. The Frontier/all-metrics target remains open.

ABI `49ea093` and JavaScript `f720ae2` publish the selected change; the standalone
JavaScript suite passed too. The module adds 888 bytes (0.226%).
`wire-child-release-cohorts-150-152.json` binds published distribution `886f6b34`
and an emitted module byte-for-byte identical to the paired candidate. Three
fresh processes, 200 warmup calls and nine rotated rounds give compact decoding
0.644 µs and portable 0.736 µs versus Frontier 0.429 µs: Ink still takes
1.50×/1.72× longer. Per-process compact Ink is 0.493–0.794 µs, portable
0.713–1.227 µs and Frontier 0.311–0.783 µs. All processes, including the outlier,
are retained. The cohort uses the full harness's mixed-schema setup and shows
high variation; its absolute times cannot establish a causal regression or gain
against older releases or isolated paired experiments. Further phase/profile
controls remain necessary. State, encoding, text conversion, startup and memory
are not reranked here; the full goal remains unmet.

## Schema-derived decoder resources

Decoder binding computes auxiliary requirements across the entire recursive
descriptor graph. Compact decoding omits its DataView when no fixed numeric lane
can need it; generic record decoding allocates its reusable property descriptor
only when a record wider than four fields is reachable. Flags remain in private
codec binding state, leaving the shared encode/decode plan shape unchanged.
All framing, tag, Unicode and resource checks remain active. This is fixed ABI
resource machinery, not an algebraic database rewrite or proof of the backend.

Three paired update-message processes give portable decode speedups of 1.476×,
1.651× and 1.546× (median 1.546×); compact decode is 1.184×, 1.446× and 1.406×
(median 1.406×). Encoding is approximately unchanged; incidental timing gains
are not attributed to this decoder-only change. Numeric-list decoding is near
unchanged, wide-record decoding has a small median gain, and recursive numeric
portable decoding improves in all three controls. These diagnostics cover the
specific fixtures and shallow timed consumers, not every possible schema/use.
Full-value preflight and separate conformance checks remain mandatory.

The first variant put flags on shared plan objects and regressed encoding in
wider-schema controls. Private flags remove that change; a later lazy descriptor
variant had a small wide-record compact-decoding tradeoff. The selected version
reserves required descriptors before reading and keeps the original record loop.
All four exact candidates and raw measurements are retained in
`wire-decode-resources-summary.json` and `artifacts/wire-decode-resources/`.
Full ABI and mandatory JSON/state suites passed, including recursive numeric
reachability, wide/prototype-key records, malformed-byte mutations, lowered
budgets, exact snapshots, rollback and forged-proof rejection. A DataView-spy
test confirms the omitted allocation on a nonnumeric recursive compact schema,
and its reservation for a numeric branch not selected by the particular value.
These paired results do not establish a new Frontier or lifecycle ranking.
ABI `6ae7c57` and JavaScript `cc3f1e3` publish the selected implementation. The
standalone JavaScript suite also passed. This generated module adds 256 bytes
(0.065%); equivalent startup and peak-memory rankings remain unmeasured.

`wire-decode-release-cohorts-140-142.json` binds published distribution `ec71759c`,
ABI `6ae7c57` and JavaScript `cc3f1e3`. The emitted module exactly matches the
selected paired candidate. Three fresh processes, 200 warmup calls per lane and
nine rotated rounds give compact decode 0.428 µs and portable decode 0.596 µs,
versus Frontier 0.317 µs. Ink still takes 1.35×/1.88× longer. Per-process compact
Ink is 0.385–0.495 µs, portable 0.576–0.747 µs and Frontier 0.314–0.458 µs.
Complete fixture preflight passes. Different host conditions and process warming
prevent treating absolute times from previous releases as causal before/after
gains. Encoding, state, text conversion, startup and memory are not reranked here;
the all-metrics target remains unmet.

## Immutable default policies and scalar encoder limits

Value codecs now reuse private immutable default policies; every invocation
retains independent byte/node/depth counters. Arbitrary supplied options still
undergo complete normalization and hard-limit checks. Encoder resets snapshot
byte/depth limits into scalar fields, and the typed encoder snapshots its depth
bound once. This is fixed ABI resource machinery, not a source rewrite or new
database proof authority.
ABI `72b2643` and JavaScript `1cbc5f9` publish the selected change. Full ABI and
standalone JavaScript suites passed. Mandatory JSON/state parity passed five
JSON and two maintained-state tests, covering lowered budgets, all CPU lowerings,
GPU-host observations, exact snapshots, rollback and forged-proof rejection.
This fixture's module adds 472 bytes (0.12%); startup and peak-memory rankings
remain unmeasured.

Three paired processes for dynamically created Update codecs give median
speedups of 1.643× portable decoding, 1.649× compact decoding, 1.307× portable
encoding and 1.366× compact encoding. Explicit reduced-budget results remain
separate; both processes pass and show no regression. Row replacement improves
1.055× median (individual process ratios 1.015×–1.194×). Large-document encoding
is approximately unchanged/slightly faster (1.021× median), and full binary
editing improves 1.033× median. No gain is attributed to unchanged JSON text
algorithms or incidental timing variation in other lanes.

The first default-policy-only candidate consistently slowed large-document
encoding (0.804×–0.930×) and is rejected. Scalar encoder bounds remove that
regression in all three repeated processes while retaining the message gains.
`wire-scalar-budgets-summary.json` retains every raw experiment; exact baseline,
both candidates, source, tests and old/new harnesses are archived in
`artifacts/wire-scalar-budgets/`. These paired diagnostics do not establish a
Frontier, startup or memory win. The all-metrics target remains open.

`wire-scalar-release-cohorts-120-132.json` binds published distribution `72852dfc`,
ABI `72b2643` and JavaScript `1cbc5f9`. The compiler-emitted module exactly matches
the paired scalar-budget candidate. Three fresh processes per message operation,
200 warmup calls and nine rotated rounds give the following process medians:

| Message boundary | Ink µs/call | Frontier µs/call |
| --- | ---: | ---: |
| Portable encode | 0.690 | 0.691 |
| Agreed-schema encode | 0.489 | 0.691 |
| Portable decode | 0.692 | 0.352 |
| Agreed-schema decode | 0.469 | 0.352 |

Compact encoding wins 1.41×; portable encoding is approximately tied. Compact
and portable decoding still take 1.33×/1.97× longer. Update sizes remain
15 compact / 84 portable / 20 Frontier bytes, with distinct protocol contracts.
The same release's three replacement processes preserve complete outcomes,
logical state and exact Ink snapshots. Ordinary replacement is 2.627 µs versus
Frontier main 0.693 µs; prepared replacement is 1.004 µs versus 0.487 µs with
preparation excluded for both. The indexed lane remains a separately supplied,
older frozen artifact, explicitly hash-bound; it is not automatically regenerated
by baseline selection. The source algorithm has not changed. Host conditions vary;
absolute times from previous releases are not causal before/after evidence.
Queries, detached JSON output, text pipelines, startup and memory are not reranked
by this cohort, and the full performance goal remains unmet.

## Incremental checked text rendering

The JSON boundary now accumulates validated output into a string rather than
retaining an array of fragments and joining it. Every shape, numeric-token,
Unicode, duplicate-name and text/wire resource check remains in the same order.
This is ABI string construction, not a database algorithm replacement or new
proof authority. The exact emitted candidates, source, regression fixtures and
harness are archived in `artifacts/json-render-rope/`.
ABI `5aa034a` and JavaScript `b8c36c3` publish the change. Full ABI and standalone
JavaScript suites passed, as did mandatory cross-target JSON/state parity:
five JSON tests and two maintained-state tests, including exact portable state,
rollback and forged-proof rejection. Logs and full package revisions are archived.

Three paired processes with complete UTF-8 output consumption give rendering
speedups of 1.153×, 1.092× and 1.164× (median 1.153×). Complete text editing
improves 1.053×, 1.041× and 1.091× (median 1.053×). The separate text-only
boundary improves rendering 1.131×, 1.285× and 1.157×; consumer flattening is
therefore measured explicitly rather than assumed free. Four-field Unicode and
4096-field nested UTF-8-consumed fixtures improve rendering 1.109×/1.256× and
complete editing 1.143×/1.107×. Parsing is unchanged by the source edit; its
measured variation is noise, not a claimed gain.

Literal JSON constructors and applying the ASCII length regexp to short strings
show no consistent benefit and are rejected. All raw reports remain intact in
`json-render-rope-summary.json`. These are paired implementation diagnostics;
they establish no new Frontier, startup or peak-memory ranking. The text gap
and the full all-metrics target remain open.

`json-render-release-cohorts-110-112.json` binds published distribution `61e2ced5`,
ABI `5aa034a` and JavaScript `b8c36c3`. The compiler-emitted module is byte-for-byte
identical to the measured rope candidate (391,822 bytes, 17 bytes smaller than
its baseline). Three fresh processes, 200 warmup calls and nine rotated rounds
give median text → known edit → text times of 414.879 µs for Ink and 88.889 µs
for Frontier: Ink still takes 4.67× longer. Per-process Ink is 401.633–514.313 µs
and Frontier 87.408–89.732 µs. The Ink binary pipeline is 1632.449 µs and crosses
extra transport boundaries. Complete fixture preflight passes. Host conditions
vary; compare paired experiments for causal before/after evidence rather than
absolute times from earlier cohorts. This cohort does not rerank state workloads,
message codecs, detached logical output, startup or memory.

## Literal wire materialisation

ABI `116e779` and JS `184e96a` add trusted literal materialisers for
compiler-derived value codecs. Complete generic validation runs first; source
field names are emitted literally and outputs own their containers. Arbitrary
runtime `createValueCodec` schemas retain the generic decoder. Full ABI/JS and
mandatory JSON/state parity suites passed; emitted-versus-generic decoding
compares mutated headers/body bytes, recursion, floats/integers, compact counts,
lowered budgets and prototype-safe fields. The materialisers remain trusted
backend code, not proof authority.

All four paired `variants-codec-literal-wire-final-*` reports are retained.
Large-document decode speedups are 0.987×, 1.575×, 1.655× and 1.635× (median
1.605×); the first noisy process did not show a gain. Complete binary editing
improved less and was roughly unchanged in one process. The generated module
grew 12,300 bytes, from 379,539 to 391,839 bytes (3.24%). Startup/peak memory
superiority remains unproven.

`json-targeted-101.json` checks the warmed complete pipelines with 200 warmup
calls per lane and 50 ms pilots. Ink text editing is 418.436 µs versus Frontier
80.115 µs; the full Ink binary pipeline is 1388.289 µs and crosses extra transport
boundaries. The text gap remains. The `variants-transport-*` update-message schema
is created dynamically and does not use this materialiser; those noisy timing
differences cannot establish a gain from the compiler change. Exact modules,
sources and harnesses are archived in `artifacts/literal-wire/`.

## Owned-value release and phase controls

Distribution `d211fbb3` publishes ABI `e605df8` and JS `1c5082e`.
`ValueCodec.capture` validates and returns an owned canonical logical tree in one
traversal, without binary buffers. `copy` assumes stable, already valid values.
`callOwned` keeps the pure-call trusted input contract and emits literal typed
result copying with static field names. It checks resource budgets and retains
preconditions; unsupported owned capabilities do not disable ordinary calls.
Algorithms and equality authority remain in knowledge. Full ABI/JS and mandatory
JSON/state integration suites passed, including exact float bits, integers,
recursion, detachment, limits, preconditions and portable snapshots.

`owned-values-paired-summary.json` records a 15.45× median process speedup over
the historical Ink structured-clone mechanism for warmed complete owned editing.
The compiler adds 16,812 bytes (4.63%) to this fixture's generated module.
Generic checked copying improves about 2.5× and generic trusted copying about
3.2×; profiling identified dynamic record keys as the remaining copying cost.
The compiler emits ordinary declared types literally, without JSON recognition
or runtime source generation. Tests do not prove backend correctness.

`owned-release-cohorts-90-92.json` retains the complete early-execution suite.
With its three-call warmup and ten-call pilot, the detached lane still loses.
It is an earlier-execution measurement, not the warmed throughput result. Warmup,
pilot duration and shared-host conditions differ; these do not isolate one cause.
Those results are not
discarded or replaced. `owned-warm-cohorts-93-95.json` applies 200 warmup calls
to every library/lane and 50 ms pilots, then nine rotated rounds in three fresh
processes. Median warmed detached-output times are 61.768 µs for Ink and
104.943 µs for Frontier, a 1.70× Ink win. Per-process Ink is 54.995–64.631 µs;
Frontier is 100.672–106.313 µs. Checked Ink copying remains slower than Frontier.
Both primary owned comparators pass independent value and complete object-identity
detachment checks; generic capture also has separate ABI conformance coverage.

This is a warmed detached-edit result, not an all-metrics, startup or memory win.
Other known gaps include ordinary replacement, JSON text conversion, message
decoding, general snapshot diff and equivalent lifecycle/memory comparisons.
The literal/runtime helper cost and earlier execution must remain visible when
choosing a boundary. Exact modules, sources, profile samples and diagnostic
harnesses are archived under `artifacts/owned-values/`.

## Earlier complete Frontier comparison

`json-boundary-release-cohorts-80-82.json` binds distribution `91ddf323`, ABI
`4e7af56` and JS `1e8dd79`, with three fresh processes and nine rotated rounds.
Full replies, state, rollback, events, versions and exact Ink snapshots passed
preflight. The JSON suite now separates sharing from fully detached outputs;
both libraries' owned lanes clone their result and reject any input/output object
identity intersection before timing.

| Boundary | Ink µs/call | Frontier main/control µs/call |
| --- | ---: | ---: |
| 4096-row replacement | 2.440 | 0.736 |
| Prepared replacement, preparation excluded for both | 0.784 | 0.452 |
| Mixed operations | 41.903 | 132.490 |
| Read-heavy, literal Ink | 134.720 | 380.552 |
| Read-heavy, supplied checked indexed Ink | 5.014 | 380.552 |
| 512-field retained JSON edit, sharing allowed | 3.100 | 73.133 |
| Fully detached mutable JSON output | 785.333 | 98.349 |
| Text → edit → text | 642.310 | 77.872 |
| Portable message encode/decode | 0.832 / 1.375 | 1.149 / 0.700 |
| Agreed-schema message encode/decode | 0.649 / 0.965 | 1.149 / 0.700 |

The retained sharing win does not establish a detached-output win. At this
earlier epoch Ink used native `structuredClone` of its larger logical datatype
tree for detachment; the owned-value section above measures its replacement.
Indexed replacement costs 20.419 µs, so the supplied query alternative has an
update tradeoff and is not the automatic default. Binary JSON validation is
272.481 µs versus 69.911 µs for Frontier's JSON text parsing/validation, with
different input contracts. The complete binary editing pipeline is 2118.575 µs.
Updates remain 15 compact / 84 portable / 20 Frontier bytes. Compact requires
an agreed schema/format. Startup, peak memory and arbitrary Ink snapshot diff
remain unranked or unsupported; the all-metrics target is unmet. Absolute times
from older releases are not controlled before/after measurements. Exact emitted
modules, harnesses, fixtures and preparation are in `artifacts/boundary-release/`.

## JSON boundary and bound scan follow-up

ABI `4e7af56` binds portable validation/visitation to a separate immutable-schema
plan and cursor, preserving complete checks and postorder callbacks. Decoding
keeps its existing plan and methods. JSON and typed JSON share an exact token
reader with fast unescaped strings and ASCII whitespace/long-text byte counts.
Rendering retains native string escaping and rejects missing array elements.
No wire format or source algorithm changes, and no new equality authority is
granted. Full ABI and mandatory JSON/maintained-state integration suites passed.

`json-boundary-paired-summary.json` aggregates three fresh paired processes,
15 alternating rounds per operation. Against the published primitive-capture
module, median process speedups are 3.05× for schema validation, 1.49× for JSON
binary validation, 1.25× for full binary editing and 1.15× for text editing.
Document encoding/decoding and logical validation are approximately unchanged.
These are warmed diagnostics with construction/first binding excluded, not a
Frontier ranking or a memory/startup claim. Standalone rendering is still costly.

`json-boundary-cpu-samples.json` and archived profiles show that parsing and
rendering dominate the text pipeline; the compiled edit is a small share.
The cursor-sharing experiments (`bound-scan-final`, `separate-scan`) retained
validation gains but regressed decoding; the published candidate uses separate
cursor methods. Indexed rendering and manual string escaping were removed after
the rendering measurements regressed. Exact accepted/rejected modules, source,
harness and hashes are under `artifacts/json-boundary-followup/`.

## Primitive capture follow-up

JavaScript revision `b08a052988cdedd8ac8b24671d256c6fc59382c5` emits
primitive record-field ownership checks directly, with the same field reads,
validation order, resource charges and detached composite ownership. The full
JavaScript lowering suite and the mandatory JSON/maintained-state integration
suites passed, including the two Wasm CPU lowerings.

The paired replacement diagnostics `variants-row-inline-capture-repeat.json`
and `variants-row-inline-capture-third.json` reduce median time by 11.9% and
12.4%. The final shared-helper artifact in
`variants-row-primitive-capture-final-final-1.json` reduces it by 33.9% in that
process; this variability is not a new Frontier ranking or a guaranteed gain.
An initial run was overwritten before unique run labels were added, so its raw
measurements are unavailable and are not evidence here. The harness now refuses
to overwrite an existing report. Exact modules, final source and the diagnostic
harness are archived under `artifacts/primitive-capture/`, with SHA-256 bindings.

The broader record/sum fusion experiment was rejected:
`variants-row-fused-capture.json` increased replacement time by 31.7%.
Its module is archived for reproducibility, but the transformation is absent
from the published compiler. These are operational ownership improvements, not
database equality laws or formal backend correctness proofs. The full comparison
below predates this follow-up; the all-metrics target remains unmet.

## Combined decoder/Core release

`decoder-release-cohorts-70-72.json` records the complete distribution at
`a09be9f7`, with descriptor-bound portable/compact decoding, the final canonical
count fast path, and the integrated Core/ownership/numeric primitive changes.
Full artifact/source/revision bindings are in the report. Every fixture has three
fresh processes and nine rotated rounds. The medians include:

| Boundary | Ink µs/call | Frontier main/control µs/call |
| --- | ---: | ---: |
| 4096-row replacement | 3.570 | 0.872 |
| 4096-row mixed operations | 48.502 | 156.799 |
| 4096-row read-heavy, literal Ink | 153.281 | 444.016 |
| 4096-row read-heavy, checked indexed Ink | 5.589 | 444.016 |
| 512-field retained JSON edit | 8.516 | 91.522 |
| 512-field text → edit → text | 838.927 | 97.317 |
| Portable message encode/decode | 1.523 / 1.830 | 1.562 / 0.925 |
| Agreed-schema message encode/decode | 0.749 / 1.370 | 1.562 / 0.925 |

Compact encoding wins by about 2.08× and its update remains 15 bytes versus
Frontier's 20. Portable encoding is close to the control in this cohort. Both
decoders still lose, as do ordinary row replacement and JSON text conversion.
The full binary conversion pipeline is 3043.925 µs versus the 97.317 µs text
control, with different transport boundaries. Supplied indexed state wins queries
but costs 27.742 µs for replacement. All-metrics superiority remains unproven.
The new Core primitive/math/text suites and C/JS in-place ownership conformance
passed before this integrated measurement; tests are not backend correctness proofs.

## Descriptor-bound decoder follow-up

The decoder experiments retain complete scalar, Unicode, tag, frame, count,
node/depth and ownership checks. Descriptor operations bind lazily on first
materialisation; the generic scanner/compact validator remain independent.
Mutation fixtures compare acceptance as well as values. No source rewrite or
formal codec proof follows from these operational changes.

`variants-codec-stable-decoder-plan.json` reports 1.92× faster 512-field document
decoding and 1.16× faster complete binary editing against the same-process frozen
ASCII-encoder baseline, with other codec paths roughly unchanged. An earlier
lazy-binding candidate changed plan shapes and regressed validation; stable
decoder slots removed that observed regression. The compact decoder follow-up
in `variants-transport-compact-decoder-plan.json` improves small-message decoding
1.89× (compact) and 1.76× (portable), with encoding roughly unchanged. The final
single-byte count/tag experiment improves compact decoding another 1.11×.

`stable-decoder-lifecycle-nine-processes.json` diagnoses nine fresh processes per
variant in alternating order, without this task running builds concurrently.
Construction medians are 0.521/0.527 ms; first decode plus rendering is 2.068/1.829
ms; 32 warmed decodes are 18.891/13.451 ms. The retained heap delta for 32 owned
documents is 6,391,464/5,180,128 bytes (19% lower). Whole-process peak RSS medians
are 89.06/87.10 MB. These are forced-GC/high-water diagnostics, not exact allocation
counts, statistical memory bounds or a Frontier memory ranking. Earlier three-
process reports are retained separately, including noisy construction cells.

The three-process Frontier cohort `decoder-comparison-cohorts-61-63.json` precedes
the final count/tag experiment: portable encode/decode are 1.054/1.421 µs and
compact encode/decode 0.841/1.163 µs, versus Frontier's 1.580/1.050 µs. Encoding
wins; decoding still loses. Retained JSON editing is 5.135 versus 79.181 µs, while
text → edit → text is 674.977 versus 78.463 µs. The all-metrics goal remains unmet.
Candidate modules are archived under `artifacts/decoder-experiments/`.

## Published session-codec release

`session-release-cohorts-40-42.json` binds distribution `eaa24856`, ABI `0279510`
and JS `21d7391`, with complete full revisions, code hashes and three independent
processes. Each process has nine rotated rounds. The fresh release medians are:

| Boundary | Ink µs/call | Frontier main/control µs/call |
| --- | ---: | ---: |
| 4096-row replacement | 3.451 | 1.074 |
| 4096-row mixed operations | 47.143 | 157.734 |
| 4096-row read-heavy, literal Ink | 200.954 | 613.583 |
| 4096-row read-heavy, checked indexed Ink | 7.908 | 613.583 |
| 512-field retained immutable JSON edit | 8.357 | 101.105 |
| 512-field text → edit → text | 829.260 | 102.893 |
| Portable message encode | 1.172 | 1.617 |
| Portable message decode | 2.303 | 0.922 |
| Agreed-schema message encode | 1.641 | 1.617 |
| Agreed-schema message decode | 2.312 | 0.922 |

Portable encoding wins this cohort. Compact encoding is close to the control,
while both decode lanes remain slower. The compact update remains 15 bytes
versus 84 portable bytes and 20 Frontier bytes. Setup and peak memory are still
not ranked. Different host conditions prevent treating absolute times from the
following historical cohort as a controlled before/after comparison.

## Earlier integrated and development cohorts

The integrated ABI `6d67e5d` / JS `bfd920a` cohort is frozen in
`integrated-status-cohorts-20-22.json`, with exact full revisions and code hashes.
Numbers are medians of three process medians, each from nine rotated rounds:

| Boundary | Ink µs/call | Frontier main/control µs/call |
| --- | ---: | ---: |
| 4096-row replacement | 2.656 | 0.705 |
| 4096-row mixed operations | 43.866 | 139.441 |
| 4096-row read-heavy, literal Ink | 139.941 | 406.141 |
| 4096-row read-heavy, checked indexed Ink | 6.055 | 406.141 |
| 512-field retained immutable known JSON edit | 6.908 | 79.706 |
| 512-field text → known edit → text | 764.661 | 78.975 |
| 512-field text → binary request/call/reply → text | 3744.367 | 78.975 |

The indexed lane is supplied and checked, not the ordinary default selection.
It costs about 21 µs for row replacement and needs usage/lifecycle evidence before
selection. Source errors, full replies, events, versions, rollback and logical
state agree across the adapters; Ink lanes additionally share exact checkpoints.
The plain source query has no scalar keep. Keep journal improvements therefore
do not explain these query or row-write timings.

Subsequent codec experiments are separate epochs. In
`variants-codec-compiled-encoder.json`, cached schema-directed forward encoding
improves full document encoding by 1.60× and the complete binary pipeline by 1.11×
against the same-process frozen baseline. Other lanes are approximately unchanged.
No before/after absolute-time claim follows from the shared host.

`json-targeted-30.json` introduces the explicitly agreed-schema transport.
The update is 15 bytes, versus 84 for portable v1 and 20 for Frontier's patch.
The document is 7121 bytes versus 22747 portable bytes and 6604 JSON-text bytes.
The first timing run still loses message encode/decode to Frontier. Schema
identity/format negotiation occurs outside compact messages; portable messages
remain self-identifying. These are different protocol contracts.

`variants-transport-compact-header.json` pairs the subsequent bounded-scratch,
short-ASCII and portable-header candidate against the first compact implementation.
Portable message encode/decode improve 1.76×/1.32×, and compact encoding improves
1.40×. Compact decoding is close to unchanged (1.04×). The separate scratch-only
experiment's lazy DataView change did not improve measured compact decoding and
was removed. These diagnostic ratios do not establish a Frontier win.

`artifacts/` retains the measured integrated modules and harnesses, plus the
subsequent candidate modules. The integrated copies are checked against the
cohort's original SHA-256 fingerprints; historical files are not rewritten when
the current harness changes.

`state-*.json`, `json-*.json` and `variants-*.json` retain raw measurements and
historical development epochs, including rejected experiments. Do not combine
their different source/artifact bindings. The older `status-2026-10-13.json` is
superseded by the explicit integrated cohort, not rewritten. Peak memory,
equivalent startup and a general Ink JSON snapshot diff remain missing.

See `../../bench/frontier-json/README.md` for exact commands, timing boundaries,
control preparation and limitations. Backend/codec conformance tests do not
constitute formal compiler or codec proofs.

## Direct agreed-schema JSON emission

The optional JavaScript `JsonCodec.parseCompact` and `TypedJsonCodec.parseCompact`
paths emit schema-directed session bytes directly from tokens. They avoid a
logical datatype tree, retain canonical count prefixes and exact record order,
and run the full compact schema validator on the finished bytes. Generic bounded
writer frames and deferred counts are shared machinery; no compiler JSON
recogniser or new equality authority was added. Portable values/checkpoints and
the existing logical APIs remain unchanged.

`compact-json-stream-summary.json` keeps both candidates and all paired data.
The final count-patch candidate handles one-byte deferred counts without a
temporary array or shifting the payload. Three numeric 512-field processes give
1.167× / 1.183× / 1.175× speedups over the frozen logical parse/encode boundary.
Single-process controls give 1.007× for nested 512-field input and 1.095× for
nested 4096-field input, but 0.967× for Unicode 512-field and 0.705× for Unicode
4-field input. Direct emission is therefore an explicit alternative, not a
universal replacement. Portable streaming controls are 0.996×–1.083×; message
encode/decode controls show no observed regression. These fixture controls need
repeats before making a stable workload ranking. Timings consume byte length,
after complete bytes and decoded/rendered values pass preflight.

The initial insertion candidate's small/large/transport sequence is conservatively
excluded from ranking because a subsequent compiler build may have overlapped
the end of that sequence. Raw evidence is preserved; the final candidate suite
ran with no compilation, tests or profiling concurrently. Exact source, module
hashes, baseline, both candidates, harnesses and conformance fixtures are archived
in `artifacts/compact-json-stream/`. ABI and mandatory JSON/state CPU suites
validate resource failures, count-width transitions, reordered/prototype-named
records, Unicode, exact numbers, callback failure/reentry and portable parity.
These operational tests do not prove backend correctness. The all-metrics
Frontier objective remains open.

`compact-stream-lifecycle-cohorts-180-185.json` reruns eight fresh-process
lifecycle controls per cohort against published distribution `de75b0bb`, with
direct and logical compact construction alternating across three cohorts each.
The 32-document initialization medians are 17.099 ms for direct Ink, 25.771 ms
for logical parse/encode Ink, and 9.465 / 9.136 ms for their separate Frontier
root-set-patch controls. Direct construction improves this Ink phase by 1.51×,
but still takes 1.81× longer than its Frontier control. These are complete
initialization phases, not per-call throughput or interchangeable formats.
Compact buffers remain exactly 7,121 bytes per document versus Frontier's 5,620;
portable Ink remains 22,747. Direct compact pre-verification process peak RSS
is 77.40 MB, versus logical Ink 83.59 MB and its Frontier control 73.12 MB.
Whole-process/JIT/GC effects prevent an exact allocation or universal memory
claim. Owned-tree and live-state footprint gaps persist. No compiler/test/profile
job ran concurrently with this measured sequence.

`compact-stream-release-cohorts-186-200.json` reranks five matched boundaries
against the same published module in three fresh processes each. JSON kernels
use 200 warmups, 50 ms pilots and nine rotated rounds; state uses its existing
fixture setup/pilot and nine rotated rounds. Results are medians of process
medians, on a shared Node 26.1 / Apple M2 host:

| Boundary | Ink µs/call | Frontier µs/call | Ink result |
| --- | ---: | ---: | --- |
| Detached result from stable prepared logical inputs | 53.030 | 97.791 | 1.84× faster |
| Compact message encode | 0.464 | 0.654 | 1.41× faster |
| Portable message encode | 0.645 | 0.654 | Approximately tied |
| Compact message decode | 0.783 | 0.605 | 1.29× longer |
| Portable message decode | 1.318 | 0.605 | 2.18× longer |
| 4096-row replacement | 2.559 | 0.718 | 3.56× longer |
| Prepared replacement, both preparations excluded | 0.771 | 0.446 | 1.73× longer |
| Text → known edit → text | 360.424 | 80.016 | 4.50× longer |

Complete outputs, detached object identities and source histories pass preflight.
The public checked-capture edit is 322.474 µs; it includes external logical input
validation, so it is a separate boundary from the caller-trusted detached lane.
Ink's full binary text pipeline remains 1,448.262 µs and contains extra boundaries.
The supplied older indexed implementation is explicitly hash-bound and costs
21.815 µs for replacement; it is not silently substituted for the new baseline.
Shared-host absolute differences from older epochs are not causal speedup claims.
JSON exact tokens/member order and protocol/schema differences remain explicit;
general arbitrary JSON snapshot diff is still a feature gap. The whole-goal
Frontier win has not been achieved.

The direct-document example composes the validated `JsonCodec.parseCompact` bytes
into a checked argument record with `encodeWith`. `TypedJsonCodec` follows the
declared source record/sum shapes; it does not implicitly make an embedded library
Json field transparent. The compiled compact-call composition is now checked
against the ordinary encode/call result in the JSON conformance suite.

## Private value layout probes and proof infrastructure

`private-layout-probe-cohorts-214-216.json` explores generic carrier layouts,
without changing the compiled implementation. One-field records elide, nested
sums flatten, tag/payload words use guarded exact integers, and two-field record
sequences may use native objects only when duplicate keys and the full original
key order are preserved. Numeric strings use the compact branch only when
conversion back is exactly equal; other tokens retain their full spelling.
Usage-derived key templates keep exact guards and fallback. Declared record
field templates come from the source descriptor. No JSON field name grants
compiler authority.

Three fresh processes retain 32 prepared 512-field documents or 4096 independently
owned rows in plain Maps. Layout-only retained heap medians are:

| Carrier | JSON bytes | Row bytes |
| --- | ---: | ---: |
| Native ordinary-value copy control | 131,256 | 707,776 |
| Ordinary Ink logical tree | 4,349,920 | 2,905,656 |
| Guarded native-object sequences | 62,656 | 740,960 |
| Guarded templates from usage/source fields | 83,688 | 683,968 |

These experiments motivate compiler integration; they do not establish a
Frontier or compiled-state win. Prepared inputs, copying/conversion, input graphs,
imports and setup have explicitly different boundaries from the actual lifecycle
comparison. Parsing/action execution/transactions are absent here. Native copy
uses `structuredClone`, which retains markedly different wide-object shapes from
`JSON.parse`; comparing one native representation with the other would be
misleading. The template alternative has a CPU and compilation-size tradeoff.
All variants reconstruct exact source values/wire bytes and reject changed
resource budgets; numeric-key ordering, duplicate-key fallback, prototypes,
recursive sums and raw float bits have targeted controls. Core/backend proofs and
complete histories remain required before selecting a private layout.

Proof authoring hit the 16 MB object limit with literal circuits. The explicit
`shared-v2` circuit mode now folds/reuses Boolean gates while retaining default
legacy CNF bytes. A representative obligation shrinks from 78,828 to 1,763
clauses. 48 tagged-word equations for 1–12 tag bits replay through ordinary RUP,
with bounds as premises. See `docs/shared-bit-circuits.md` for scope, tests and
the two independently reproduced baseline hardening failures. No new source
optimisation or private layout is admitted merely by these measurements/proofs.

## Compiled record elision (217–237)

`record-elision-cohorts-217-237.json` measures the first compiled private layout,
with six source-bound record sites and ordinary bidirectional database proofs.
The complete source program and public/wire/checkpoint observations remain equal.
Three fresh processes per boundary/implementation use the existing 512-field JSON
and 4096-row state fixtures, nine rotated rounds and the shared Node 26.1 / M2
host. JSON uses 200 warmups and 50 ms pilots. Lifecycle cohorts use eight fresh
children each, with forced-GC retained observations separate from throughput.

| Boundary | Ordinary Ink | Selected elision | Frontier |
| --- | ---: | ---: | ---: |
| Detached edit from prepared logical inputs (µs) | 37.211 | 327.627 | 100.744 / 102.046 |
| Text → known edit → text (µs) | 291.770 | 892.851 | 81.173 / 80.411 |
| 4096-row replacement (µs) | 2.846 | 2.321 | 0.702 / 0.726 |
| Prepared replacement, preparation excluded (µs) | 0.792 | 0.796 | 0.475 / 0.461 |
| Live state retained heap (bytes) | 3,243,984 | 2,326,048 | 838,672 |
| Public owned JSON trees retained heap (bytes) | 3,815,360 | 3,815,264 | 790,608 |

Selected state retains **28.3% less heap** and ordinary replacement takes **18.4%
less time** than the ordinary carrier in these cohorts. Frontier still wins both
boundaries. Prepared replacement is approximately unchanged. Public JSON trees
keep their mutable logical format, so this layout does not reduce their memory.
Forced-GC deltas and shared-host times are observations, not universal guarantees.

Selecting private wrappers for the entire module makes logical pure calls much
slower: the input tree must be converted and the output reconstructed. The recipe
therefore remains an alternative requiring comparable lifecycle selection, not a
new unconditional default. A private captured-value boundary and literal wire
materialisation/writing are the next integration work; layout-only prototype
numbers remain ineligible as compiled performance evidence.

The previous release is rerun in processes 235–237: its detached result costs
36.369 µs versus its Frontier control 102.728 µs. Therefore the historical change
from 53 to 37 µs is **not** evidence of a new compiler speedup. Both ordinary
releases win that ownership boundary. Direct owned-result copying is verified
implementation machinery; these JSON observations do not establish its separate
profitability. Message microbenchmarks differ from the prior focused cohorts and
must not be pooled across operation order or process epochs.

The measured modules embed the pre-concurrent JavaScript object-adapter ABI.
Their exact bytes, source, plan, proofs and logs are archived under
`artifacts/compiled-record-elision`. Publication preserves the subsequent explicit
object adapters; these numbers remain bound to the archived modules. Full Core,
JavaScript, producer/recipe and mandatory CPU JSON/state checks pass; the latter
includes GPU host observations, not arbitrary real-device JSON coverage.
The all-metrics Frontier goal and arbitrary JSON snapshot-diff capability remain
unfulfilled. See `docs/private-record-layouts.md` for admission and trust scope.

## Captured private values and literal binary calls (242–247)

`compiled-values-cohorts-242-247.json` reports three fresh processes per boundary,
with 512-field prepared documents, 200 warmups, 50 ms pilots and nine rotated
rounds on the same shared Node/M2 host. Process 241 is retained as diagnostic data
and excluded because source eligibility emission overlapped setup.

| Captured-input boundary | Median µs/call |
| --- | ---: |
| Ink detached owned output | 36.536 |
| Frontier detached owned output | 104.964 |
| Ink retained private output | 3.283 |
| Ink compact encoded output | 216.493 |
| Ink logical input and owned output, selected layout | 322.471 |

The captured owned boundary is **2.87× faster** than its paired Frontier lane.
Both lanes start from independently owned captured inputs and return complete
mutable detached outputs. Capture is excluded from hot calls and recorded
separately: initial Ink validation/capture/conversion takes roughly 2.8 ms in these
processes, versus approximately 45 µs for the Frontier clone. The private-output
and encoded-output lanes are different boundaries, with no matched Frontier win
claimed. Complete observations, detached identities, source reuse after output
mutation, and exact portable/compact bytes pass preflight.

The existing full binary text pipeline with the selected layout takes 797.950 µs
in processes 245–247. Its literal input/result bridge removes logical conversion
from binary execution; this remains much slower than Frontier's text boundary.
Historical selected-module numbers from 217–237 are a different emitter/ABI epoch
and are not a paired causal speedup control. The logical text pipeline remains
830.311 µs with the selected layout. Public message codecs retain their existing
logical contract. Additional capture, memory, compilation and default-carrier
controls remain necessary before a whole-lifecycle or all-metrics claim.

The frozen ten-program JavaScript corpus completed before these handle changes:
ten compile, seven have admitted rewrite alternatives, sixteen laws are admitted
(two reused across programs), and none is selected under default evidence gates.
All quick searches stop at their time budget. The new record recipe is deferred
in all ten receipts, including `compact-set`, whose elaboration contains an
eligible single-field loop carrier. Recipe dispatch now interleaves stages before
repeating a stage; the updated focused result is reported separately. Listing a
recipe is not proof that its candidates were explored or selected.

The interleaved quick rerun of `compact-set` still defers record elision under its
eight-second search cap. Its admitted alternatives rise from 20 to 21, but that
does not establish new-layout exploration or profitability. A balanced focused
run is separate evidence; the scheduling unit test only establishes dispatch
diversity when a stage has a worker opportunity.

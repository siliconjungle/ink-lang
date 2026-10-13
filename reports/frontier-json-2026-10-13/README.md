# Frontier state and JSON evidence, 13 October 2026

The all-metrics target remains unmet. Read-heavy state and retained JSON editing
win in these fixtures; row updates, conversion and message decoding still lose.
This is a shared development host, not a controlled laboratory.

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

# Frontier state and JSON evidence, 13 October 2026

The all-metrics target remains unmet. Read-heavy state and retained JSON editing
win in these fixtures; row updates, conversion and portable-message codecs lose.
This is a shared development host, not a controlled laboratory.

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

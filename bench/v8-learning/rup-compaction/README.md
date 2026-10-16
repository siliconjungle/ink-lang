# Ordinary RUP graph compaction

V8's graph trimmer follows dependencies from explicit roots; its use map tracks
consumers separately from definitions. Ink now applies these general graph ideas
inside the untrusted certificate author. Root-propagated consequences become
ordinary RUP unit lemmas. Sole-consumer unit lemmas are inlined only when explicit
strict hint propagation succeeds. Satisfied hints are removed, sequences stop at
the first contradiction, and unreachable steps are pruned with identities remapped.

`compact_certificate` preserves the exact CNF hash and encoding. It compares the
original, factored and inlined certificate bytes, retaining the smallest candidate.
Authoring deadlines, step/hint bounds and an eight-pass inlining cap bound the
optional search. The standalone author exposes `--compact-seconds`, default zero.
The checker still reconstructs its ordinary circuit and replays every hint. No
source recognizer, theorem whitelist, CNF encoding, proof format or admission
budget changes. Proof liveness grants no permission to omit source work/errors.

## Installed libraries

All 83 word and 15 F32 laws replay. Forty-three word certificates shrink; all
statements, parameters, conditions, dependencies and source-circuit meanings stay
identical. F32 proof bytes remain unchanged. The 43 proof content identities
necessarily change. Existing plans/observations keep their original byte identity;
no evidence or runtime choice is transferred to the new proof hashes.

| Entire 98-law collection | Before | After |
|---|---:|---:|
| Raw canonical law bytes | 34,374,885 | 30,066,164 |
| Gzip proof-file bytes | 7,705,664 | 7,454,657 |

The 43 changed laws use 22,520,493 → 18,211,772 raw bytes. A separate, untrusted
strict replay model counts the current checker's explicit arena/reset/literal
charges: 16,909,638 → 13,090,533 across those proofs. Every changed certificate
has a lower estimate and still independently passes the actual kernel. This model
only filters packaging choices; it supplies no proof or runtime selection fact.
Canonical byte selection alone does not guarantee lower kernel work.

Twenty-eight tests cover independent strict RUP replay, input immutability,
branching/root facts, hash/encoding/forward-reference/deadline rejection, discovery,
all installed word/F32 admissions, source applications, missing premises, IEEE
payloads and rehashed corruptions. The standalone two-case author also passes
`verify-library` and exact source-replacement checking with compaction enabled.
Seven retained same-CNF controls check baseline and packed proof, then reject a
rehashed empty-hint contradiction. Their durations include setup and replay;
they are not compiler/runtime measurements.

## Checker timing control

Three fresh Python processes each alternate seven rounds over the same 43
statements in three fixed groups. Every individual checker invocation is fresh;
all groups and inputs are identical across runs. The median of the three process
medians is **9.3403 → 7.7330 seconds**. The median of paired process reductions is
16.30%. Raw samples and immutable input hashes are in `replay-*.json`; all hashes
were verified again at terminal completion.

This is the sum of complete CLI `knowledge-check` calls: startup, core/bundle
reading, canonical hashing, admission and proof replay are included; publication
preparation and Python import are excluded. The required corpus shares the host.
This establishes a narrower checker-batch improvement, not a whole compilation
or compiled-program speedup. No runtime model or automatic selection uses it.

## Conditional proof boundary

The selected U64 high-bit conditional lemma shrinks from 3,193,378 to 113,209
canonical law bytes and replays under the unchanged limits. Eight masked range
cases for `u64_quot_or_self` also check individually, but their assembled
unconditional law exceeds the object byte limit. `conditional-cases` retains
the smallest selected checked components for later composition research. A private
extension also tries non-unit sole-consumer clauses with the same strict hint
propagation; its assembled 23,762,435-byte root still fails the object limit. This
extension is outside production. Root checking stops at the byte boundary, so
assembled shared-work admission remains unverified. Only one revision of each
component is retained.
They are not
installed as default rewrites. The three original unconditional U64 self/zero
numerator proposals remain excluded. Failed whole/incremental/65-way trials are
summarized only; superseded experiment workspaces are retired.

## Reproduce

Use `source-pins.json`; the helper and refreshed library are in the exact knowledge
commit listed there. The retained compiler hash is the selected reproducibility
baseline, with the recorded proof-kernel tree. Later GPU/runtime changes are
outside this measurement's compiler image.

With `PYTHONPATH=knowledge:planner`, run `replay_controls.py --compiler PATH
--scratch FRESH_PATH` to replay the seven exact retained controls without invoking
SAT. It requires only the compressed CNF/law inputs here and writes to the declared
scratch path. Restore the current retention manifest before recreating retired
experiments. The full collection's preceding proof data is in Git knowledge
revision `920558c59d83b6cc82ccdfa73f1ee8b5f6ecd16c`; `pack_libraries.py` records the
acquisition/replay recipe. To regenerate it, materialize only that prior proof
library data in a minimal isolated checkout with the current producer source.
`filter_work.py` records the independent estimate/filter. No copied knowledge
store, dependencies or targets are required.

`prepare_replay.py` reconstructs exact old/new checker bundles from those Git
objects and the current library. `time_replay.py` runs alternating fresh checker
calls. The initial single 43-law catalogue exceeded the unchanged catalogue byte
limit; measured groups use at most eight MB of baseline entry bytes. This changes
measurement grouping, never admission limits. Restore the scripts/inputs under
`build/v8-rup-compaction` for their recorded paths.

The required frozen corpus uses `python -m ink_planner.corpus` with the recorded
compiler, `--manifest bench/planning-corpus/corpus.json --knowledge-root knowledge
--target javascript --planning-effort quick`, a fresh private scratch and output.
Source stays stable until the terminal context check. Untimed generated builds
keep debug/incremental output disabled and use the local Cargo entry point;
direct toolchain builds require actual `ink-cache prepare-sources ROOT` configs.

## Frozen corpus

All ten unchanged programs compile and admit rewrite alternatives. The report
observes 24 laws, six reused across programs, no selected alternative or physical
representation, and a final measurement-evidence gate for every program. All ten
quick time budgets expire. Median reported compilation interval is 51.422 seconds;
private publication preparation is outside that interval. No near-miss reason is
recorded. The terminal context check passes. The previous dispatch corpus reports
51.0765 seconds; these unpaired, time-saturated shared-host runs establish no
causal compilation or runtime change. Exact context, source inputs, plans and
reuse observations are in `../corpus-rup-compaction` and its adjacent summary.

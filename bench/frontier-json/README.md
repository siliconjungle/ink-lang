# Ink and Frontier state/JSON comparison

The fixtures preserve complete action replies, errors, rollback, versions,
events, acknowledgement and logical state. Ink lanes also compare exact portable
checkpoints. The source has a plain `total` query, not a retained scalar keep.
The database indexed lane is a supplied, checked alternative; it is not evidence
that ordinary compilation automatically selects it.

Install the exact npm dependencies with `npm ci --prefix bench/frontier-json`.
Use Python 3.12 with python-sat for database authoring. Build the compiler first,
then prepare fixtures and check every supplied plan:

```sh
cargo build --bin ink
build/validation-tools/bin/python bench/frontier-json/prepare.py
cargo build --release --manifest-path bench/frontier-json/Cargo.toml --target-dir build/frontier-json/target
node --expose-gc bench/frontier-json/run.mjs 20 --javascript-only --fixture=replace-4096
node --expose-gc bench/frontier-json/run.mjs 20 --javascript-only --fixture=mixed-4096
node --expose-gc bench/frontier-json/run.mjs 20 --javascript-only --fixture=read-heavy-4096
node --expose-gc bench/frontier-json/json-kernels.mjs 20
```

State controls include the exact npm release and a frozen Frontier state main
checkout at `build/frontier-state-main/dist/index.js`. `provenance.mjs` records
all Frontier/Ink revisions and compiler, artifact, fixture, harness and lockfile
hashes before timing. Acquire those independent Frontier repositories and compile
the frozen state main before running; missing controls fail rather than silently
substituting another implementation. The saved reports identify the exact
revisions used. Repeat with fresh process IDs and never overwrite historical
reports. `summarise.py --process 20 21 22 --output <path>` refuses to combine
different implementation, artifact or target epochs.

Each fixture has nine rotated rounds, after full outcome preflight and pilot
calibration. Setup, checkpoints, native IPC and captured diagnostic outputs are
outside timed execution. Input capture, detached replies, emitted events and
acknowledgement are inside. Prepared input capture is outside for both libraries;
its setup duration is recorded. Frontier adapters add the source-level transaction
contract where the package does not supply it. Initialisation differs (Ink public
puts versus Frontier bulk initialisation); do not use setup timings to rank startup.

JSON retained-edit, text pipeline, binary pipeline, validation and message codec
boundaries are separate. The binary pipeline includes text ingress and text egress
plus request/reply framing and compiled calls. It is not a measurement of a relay
that forwards existing bytes. The formats have distinct contracts. The compact
lane requires exact schema/format negotiation outside the message. Portable v1
and checkpoints retain their existing bytes. Ink has no general arbitrary JSON
snapshot-difference operation in this suite; the difference controls are
Frontier-only.

The plain retained JSON edit uses Ink's caller-trusted pure ABI. Both it and
Frontier's single-set path can share unchanged input subtrees. The separate
`known-edit-detached` group uses `callOwned` for Ink and `structuredClone` of
Frontier's result, and verifies that neither result aliases any caller input
object before timing. Separate Ink lanes retain checked `ValueCodec.capture`
and the historical `structuredClone` mechanism as controls. Use that group
for fully detached mutable output comparisons. The sharing group measures
callers managing immutable inputs/results, not fully detached host values.
The text pipeline returns owned text and needs no detached intermediate tree.

`variants.mjs` pairs frozen candidate/baseline modules in alternating order;
`--baseline=<module>` supports successive implementation experiments. These are
diagnostic comparisons, separate from the Frontier cohorts. `profile.mjs` starts
CPU profiling after warmup; profiled results never establish speed gains. No run
has exclusive CPU reservation. Retained/peak memory and equivalent startup are
not yet ranked, and no report establishes an all-metrics victory.

The `text` paired mode measures parsing, checked rendering and complete known
editing. `text-bytes` additionally UTF-8 encodes every rendered result, including
any deferred string flattening. Both accept `--fields=1..10000` and
`--text-fixture=numeric|unicode|nested`; use a unique `--run` label for every
process/fixture. Compare both consumption boundaries before accepting changes
to string construction. Fixture construction and codec binding stay outside
timing; validation and resource accounting remain inside.

The paired `transport` mode accepts `--budget=default|reduced`. Reduced mode
supplies explicit 128-byte/32-node/16-depth limits to both implementations;
default mode exercises the ordinary omitted-options API. Keep those resource
policies separate when aggregating timings.

The paired `typed-codec` control covers a 1024-element numeric list, an eight-field
record with numeric/string/prototype-key fields, and recursive exact-float/u64
records. Every format passes complete-value preflight; timed decode consumes
result truthiness, so this is an API-return diagnostic rather than a complete
downstream traversal or serialization measurement.

Diagnostic `profile.mjs` modes `message-portable` and `message-compact` decode
the dynamic Update schema after setup/warmup and consume its key and numeric
payload. Inspector samples identify implementation costs; they never establish
benchmark speed gains.

`node lifecycle-compare.mjs <fresh-id> --ink-module=<module>` runs eight fresh
child processes: each library separately for owned JSON trees, per-row live-state
initialization, portable document buffers and agreed-schema document buffers.
Defaults are 512 fields, 32 retained documents and 4096 rows; configurable counts
are bounded. The state control reuses the exact source-observation adapter from
throughput comparisons, with initialization/acknowledgement identical for both.
Imports are capability-specific. Parse/conversion, full reply/event assertions
and acknowledgement are explicitly included in initialization; this is not a
steady-state throughput comparison.

Record forced-GC heap/external/buffer deltas, exact owned backing-buffer bytes,
peak RSS before verification and whole-process peak RSS separately. GC deltas may
be negative and peak RSS includes runtime/harness/JIT overhead, so neither is an
exact allocation count or a statistical memory bound. Compact negotiation is
outside the buffer; its construction currently includes logical parse then encode.
Historical reports are immutable and differing harness/source epochs must not be
pooled. `lifecycle-cohorts-167-169.json` is the complete repeated control.

State comparisons accept `--ink-module=<emitted module>` to select an exact
baseline implementation without overwriting a frozen artifact. The runner binds
its hash before timing and verifies it afterward. The separately supplied indexed
alternative remains `build/frontier-json/ink-indexed.mjs`, with its own recorded
hash; selecting a baseline module does not silently rebuild or replace that lane.

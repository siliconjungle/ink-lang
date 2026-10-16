# Projecting and specializing one owned graph

Ink can now remove an unused working-state field, then specialize the frozen
instruction graph while its numeric weights remain mutable. All four plan steps
replay normally. Standalone core remains `feaec2d2d25e6e72ed369af470b9d6053768ec4b`:
this adds no checker rule, primitive, work/depth increase or profitability exception.

The untrusted producer opens source wrappers before generated chunks, so the
original ordered fold can meet its universal chunk bridge. A forwarding helper
retains its own ordinary prefix equation instead of expanding the entire helper
graph. Immutable capture layouts stay explicit; the owner is threaded once.
Complete action equalities cover all three actions, frozen source facts, live
weights and transaction state. This fixes proof construction, not the trusted
source-to-proof implementation.

The four-step plan is 2,242,433 bytes, including both extensions and rewrites. Its
final view has 186 mathematical objects and 95 ordinary theorems. Its largest
written proof is 58,055 JSON bytes. The earlier failed proposal repeatedly
expanded live weight observations. Counts/sizes are not correctness certificates.

## Execution checks

The new regression has 88 reference/native Rust/JavaScript/Wasm outcomes, exact
checkpoints after every call and five explicit restores. It exercises changing
and empty weights, complete outputs, signed zero, subnormals, infinities,
signalling/quiet NaN payloads, events and rollback. The existing 111-outcome
projection regression also passes in the same run. Its tested source is retained.

A separate 175-step JavaScript history matches independent reference outcomes and
the original checkpoint namespace for both baseline and selected images. Journals
preserve negative-zero spellings after comparison. Thirty-seven focused knowledge
tests pass, including both graph forms and rejection of a changed selected result.
These are finite backend/producer checks, not compiler correctness or device
execution of this graph.

The compiler receipts compare 411 root/core/stdlib and pinned Ink dependency
files, including embedded device/shader/host assets, with published Git blobs.
After an initial disk-full dev-profile link, a normal Cargo build succeeds and
reproduces all six measured JavaScript/Rust images byte for byte. It also
regenerates the complete plan as identical JSON. The earlier failure and both
compiler image identities remain explicit. No Cargo output or fingerprint was
manufactured. Third-party dependencies and toolchains remain trusted.

## Measurements include the loss

Six fresh-process triples rotate baseline, projected fold and projected/unrolled
graph. Node v22.22.1; 250,000 requests after 10,000 warmups per workload. Every
returned value is consumed. Checksums and complete final checkpoints agree
across all three implementations in every triple.

| Workload | Baseline / projected time | Baseline / combined time |
| --- | ---: | ---: |
| Read only | 1.144× | 0.876× |
| Update weights every eight reads | 1.152× | 0.890× |
| Update weights every read | 1.159× | 0.907× |

The combined implementation is correct but slower here. Its module is 260,041
bytes versus baseline's 233,907. Projection alone remains the better measured
JavaScript choice. No automatic selection is enabled. All samples are retained,
including substantial noise in pairs 1 and 2; the earlier contended pilot is
separate. This is local workload evidence, not Handwired parity, full training
throughput or general profitability. Import/initialization costs are recorded;
peak memory and device costs are unmeasured.

### The same transformation wins on native Rust

On the same Apple M4 Pro host, six native process triples use the same counts,
seeds, update schedules and complete outputs. Typed Rust state calls include
input-vector ownership and result construction; no per-call JSON parsing is
included. All three implementations are linked into one release benchmark image
with thin LTO and one codegen unit. These ratios compare implementations within
Rust, not Rust against JavaScript or Handwired.

| Workload | Baseline / projected time | Baseline / combined time |
| --- | ---: | ---: |
| Read only | 0.995× | 1.811× |
| Update weights every eight reads | 1.004× | 1.802× |
| Update weights every read | 0.991× | 1.744× |

Every native checksum and complete final checkpoint additionally matches the
corresponding JavaScript sample. The combined graph therefore supplies a useful
native variant in this workload, while the projected loop remains the better
JavaScript variant. Native projection alone shows no clear gain. A successful
proof cannot decide which backend implementation will be fastest. Cold process
startup, peak memory, fitting cost and general lifecycle profitability remain
unmeasured. `native/` retains the exact emitted sources, driver, Cargo manifest
and genuine lockfile; `paired_native.py` reruns the comparison after building it.

Explicit owned widths 1 and 2 also produce checked graph plans. Width 8 still
exhausts ordinary proof resources. Those probes establish proof construction
only; they are not additional execution or speed measurements.

## Frozen corpus and implementation assurance

The completed bounded `quick` run covers all ten unchanged corpus programs. All
compile and admit rewrite alternatives; 25 laws are admitted and six are reused
across programs. Every search reaches its configured time bound. All ten retain
the baseline at the measurement-evidence gate. This does not demonstrate a new
held-out benefit for the graph combination; its positive graph remains a
development example. The environment lacks the optional discovery modules named
in its retained context. The report binds the exact compiler, canonical knowledge
publication, planner, source inputs and environment.

The corpus collector is planner `fed5ead`, with knowledge `3cf108b`. Earlier
disk-full attempts copying the disposable SQLite index remain incomplete
infrastructure evidence. The final collector uses private filesystem COW cache
copies under rollback-journal read locks, with online backup for WAL databases.
It successfully completes all ten programs. Canonical objects and every exported
proof still authenticate independently; a cache grants no proof authority.

The subsequent planner follow-up detects fresh-inode replacement before/during
cloning and falls back to the original SQLite reader's snapshot. It also forces
a private SQLite pager. All 23 cache/corpus tests pass, including independent
writes, uncheckpointed WAL rows, lock/connection cleanup, backup failure and an
atomic source replacement. This follow-up is distinct from the pinned completed
corpus run. Both planner revisions remain recorded. It strengthens the test and
planning infrastructure, not the semantics checker.

## Reproduce

With the pinned distribution packages and knowledge checkout:

```sh
python3 -c "import gzip,pathlib; pathlib.Path('/tmp/graph.core.json').write_bytes(gzip.decompress(pathlib.Path('reports/composed-frozen-graph-2026-10-17/source.core.json.gz').read_bytes()))"
PYTHONPATH=planner:knowledge python3 reports/composed-frozen-graph-2026-10-17/compose.py \
  /tmp/graph.core.json --compiler target/debug/ink -o /tmp/composed-plan.json
ink compile /tmp/graph.core.json --core --plan /tmp/composed-plan.json \
  --target javascript -o /tmp/graph.mjs
```

`compose.py` checks the projection, authors the frozen graph and rechecks the
complete plan before replacing its output. The retained plan also replays without
its producers. This is explicit authoring, not a runtime profitability controller.
Training goals/timing remain application-defined; this example updates weights
through an ordinary learning action and does not fit a policy or choose a goal.

Run `python3 reports/composed-frozen-graph-2026-10-17/audit.py --ink target/debug/ink`
to check retained bytes, all paired results, corpus completion and the full plan.
General mutable-graph staging, broad neural/tape compilation, device training and
the remaining upstream workload programme stay open.

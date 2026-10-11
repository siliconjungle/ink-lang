# Measured lifecycle selection and incremental maintenance

The prebuilt lifecycle profile selects the direct layout after proof admission
and migration costs. Its modelled total is 73.65 ms versus 132.88 ms for refresh
and 152.08 ms for delta, about 45% below refresh on this fixture. Most of the
difference is admission/setup; there is no universal per-call speedup claim.
The new proved delta maintenance candidate does not improve these instrumented
small-workload action timings consistently.

The table pools 27 samples per phase/candidate from three independent processes
at 48 rows. Values are median microseconds, not standalone operation benchmarks.

| Complete phase | Direct | Refresh | Delta |
| --- | ---: | ---: | ---: |
| check | 26,797.8 | 87,066.3 | 102,487.5 |
| initialise | 472.9 | 1,022.5 | 1,253.6 |
| teardown | 235.4 | 604.9 | 704.0 |
| migrate | 1,285.0 | 1,881.3 | 2,288.8 |
| action:zero | 31.2 | 30.5 | 31.3 |
| action:replace_zero | 33.5 | 33.5 | 35.2 |
| action:erase_zero | 35.5 | 36.5 | 37.2 |
| action:put | 35.6 | 35.5 | 36.6 |
| action:get | 31.5 | 31.0 | 31.5 |

The allocator records maximum live requested Rust heap bytes during each region.
The resident module, proofs and all three candidates are included, while stack,
allocator metadata and RSS are excluded. Initialise restores a logical snapshot;
action timing excludes that restore and includes acknowledgement. Migration runs
the exact supplied bridge and includes decode/encode or retained-state validation.
Three-call, fused native and reference histories agree before measuring.

Compilation is measured separately: one candidate's read/check/emit and rustc
build with prebuilt release dependencies, three alternating rounds. These samples
are noisy (15–51 seconds) because integration checks were running concurrently.
The build-inclusive profile selects delta from those pooled medians; this is a
demonstration that lifecycle weights affect selection, not evidence of a reliable
compilation advantage. Compiler memory is unmeasured, so a memory-constrained
profile that includes compile cannot use these records. Stronger measurements
require an idle host and more rounds.

Raw runtime samples are trial-1/2/3.json; raw compilation samples are compile.json.
The two profile files, candidate index, target/workload files and both selection
receipts are retained. Each observation binds the exact request bytes, and migration
costs additionally bind the exact bridge bytes. Math checks do not consume timings.
The target names exact source-tree identities: these measurements precede the
subsequent integration with other main-branch work. They are archived evidence
for that recorded implementation, not measurements of every later revision.

The 0/24/48-row workload stays inside the unchanged native dispatch value-depth
limit of 64. A 96-row preliminary attempt failed transport and was not published
as performance evidence. The proof codec's larger logical limits do not establish
that a native executor accepts every such value.

Reproduce the runtime and build measurements with bench/point-delta/README.md.
Publish observations with knowledge/producers/lifecycle_observations.py, supplying
matching actual target provenance. Run planner/select_representation.py with the
retained candidate index/profile and knowledge root to reproduce the selection.
Output requests and bridges are rechecked at replay; there is no live adaptation.

Validation: all 215 new owned laws and rehashed false laws; selected source across
C, Rust, JavaScript and both Wasm paths; fixed core buffer/map bounds, ordering and
float bits; native future histories with rollback, events, restoration, migrations
and exhaustion; List state/replies/events and u64 sum/count; real checker selection
with invalid candidates/bridges, missing provenance/budget and lifecycle costs.
67 core tests, 32 planner tests, 16 canonical store tests and 3 definition-context
tests pass without archived research fixtures. Focused source/representation
regressions also pass, including native list/delta execution and both Wasm paths.
The broad historical Python research suite additionally requires generated files
and frozen compilers absent from this checkout; it is not reported as passing.

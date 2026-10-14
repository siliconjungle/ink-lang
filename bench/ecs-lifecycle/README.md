# Bounded ECS lifecycle comparison

This ports packed entity storage and sparse entity-to-slot indexing to ordinary
Ink source. The knowledge library implements create, destroy, optional Position
and Velocity components, insert/replace/remove, stale-handle rejection, and an
integration query. Deletion moves the last packed row and repairs its sparse
index. Snapshots contain every generation counter, all live rows in logical-slot
order, and ordered query membership. Values use wrapping u32 arithmetic.

The registry has a caller-supplied capacity and two fixed component types.
External handles are `(slot,generation)`, with modulo-u32 generations. It does
not guarantee stale-handle protection after 2^32 destroys of the same slot.
Invalid/stale commands and unknown kinds are ignored. This is an explicit source
algorithm, not a proved automatic replacement of arbitrary logical ECS state.
A second explicit source algorithm maintains a dense list of matching entity
slots and its inverse index. Component mutations and destruction update that
intersection; integration visits only matching slots. Both variants reconstruct
the same logical snapshot. This is a measured alternative, not an automatic
rewrite or a proved universal maintained-index representation.

There are no scheduling, reflection, relationships, serialization, durability,
parallel systems or variable component schemas in this workload.

## Controls and scope

The native harness executes actual pinned EnTT (C++) and Flecs (C), an independent
slot-array oracle, and C++ implementations of both packed algorithms. EnTT
and Flecs retain their own entity identities; adapter arrays translate the shared
external handles and generations. Their components and queries use native APIs.
The extra identity layer and general-purpose registry setup are real adapter
costs, so these numbers must not be read as a universal ECS ranking.

Each timed call copies commands, initializes storage, creates entities, applies
the complete history, materializes the canonical snapshot, copies it to the
caller, and destroys its registry. The output buffer is allocated outside timing
for every implementation. This measures complete histories, not a retained-world
steady-state API. Source unfolding and direct-buffer selection are explicit
checked plans, not automatic default profitability choices. Oversized combinations
of unfoldings are rejected; the preparation tool replays smaller cumulative
subsets through the checker and records exclusions in `rejections.json`.

Patterns are dense components, 1-in-16 Velocity membership, repeated destruction
and recreation with stale writes, and sparse membership with 256 query steps.
Other patterns use 16 query steps. Capacities are 16, 1,024 and 16,384. Every
complete output is compared before and after timing. Every prefix of the smallest
histories is checked across all seven implementations. The root conformance test
independently checks 120 observations of the same 60 histories across both Ink algorithms before and after proof-checked unfolding on
reference, C, Rust, JavaScript and both Wasm targets. GPU-host fallback is not
device execution coverage.

## Reproduction

With Rust, Clang, Python, and the pinned upstream source checkouts available:

```sh
cargo build --locked
python3 bench/ecs-lifecycle/run.py --compiler target/debug/ink --upstreams path/to/upstreams --build-only
python3 bench/ecs-lifecycle/run.py --upstreams path/to/upstreams --measure-only --rounds 8
cargo test --test physical_capabilities sparse_ecs
```

Run measurement without builds or planning jobs. Fourteen inner rounds rotate all
seven implementations through every position twice. Eight fresh processes are
the bootstrap replication units. Metadata binds source hashes, generated code,
executables, dependency locks, exact upstream revisions and toolchains. Controls
use Clang C++ and Ink uses Rust/LLVM; compiler versions are reported separately.

To compare ordinary substitution with checked sharing of repeated scalar helper
arguments, build two named variants before starting any timing:

```sh
python3 bench/ecs-lifecycle/run.py --upstreams path/to/upstreams --name substitution --build-only
python3 bench/ecs-lifecycle/run.py --upstreams path/to/upstreams --name scalar-sharing --share-arguments --build-only
python3 bench/ecs-lifecycle/compare.py substitution scalar-sharing --output build/ecs-lifecycle/sharing.json
```

The comparison requires matching source, compiler, driver, upstream pins, and
flags. Fresh-process order rotates between variants; full samples and artifact
hashes accompany the report. Sharing is an explicit candidate, not a claim that
it helps every workload or size. A sharing proof that exceeds checking limits
falls back to a separately checked ordinary unfolding proposal at that site;
failure of both proposals retains the call. No proof or core limit is relaxed.

## Admission and remaining work

The sparse-set bijection and component membership are tested here; they are not
yet universal representation proofs admitted by the database. Automatic selection
would need initialization, insertion, deletion, replacement and query-preservation
proofs, a canonical logical-state codec, and profitability evidence on held-out
lifecycle traces. Separate retained-world timing, allocation/peak-memory counts,
different occupancy distributions, more components and further languages remain.

## Measured result on Apple M4 Pro

Eight fresh processes; times are median microseconds for complete histories at
capacity 16,384. These include setup and canonical output, not just query loops.

| History | Ink packed | Ink indexed | C++ packed | C++ indexed | EnTT | Flecs |
|---|---:|---:|---:|---:|---:|---:|
| Dense / 16 queries | 339.9 | 496.1 | 237.5 | 358.0 | 733.8 | 1601.2 |
| Sparse / 16 queries | 227.3 | 168.6 | 199.8 | 159.5 | 400.0 | 1090.3 |
| Churn / 16 queries | 647.2 | 790.7 | 500.8 | 649.8 | 1688.3 | 3320.6 |
| Sparse / 256 queries | 1743.4 | 441.2 | 1448.5 | 355.6 | 728.2 | 1162.7 |

The maintained intersection improves the large sparse query-heavy case about
3.95x over the packed scan, but costs about 46% on dense histories and 22% on
churn. Its query-heavy result remains about 24% slower than the matching C++
indexed algorithm. The packed dense variant remains about 43% slower than its
C++ counterpart. These are remaining compiler/representation gaps, even where
Ink is faster than the complete EnTT or Flecs adapter. Full process samples,
intervals, toolchains and source hashes are in `results.json`.

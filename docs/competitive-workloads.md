# Competitive workload evidence

Ink still needs substantial work to compete with established voxel meshing and
full ECS implementations. This pass replaces comparisons against only our own
scalar code with pinned real upstreams and adds measured, general improvements.
No syntax or primitive semantics changed.

## Reproduce and interpret

`bench/competitive-workloads/run.py --before PATH_TO_BASELINE_INK --upstreams PATH`
uses pinned checkouts of block-mesh and Flecs plus installed LZ4 1.10.0 and Zstd
1.5.7. The exact revisions, compiler hashes, flags, generated-source hashes,
hardware and dependency lock are recorded in `bench/competitive-workloads/final.json`.
The clone-preserving integration is root commit
`43e5033e3026729f96e48a88d6a296d1b606e579`; its pinned Rust backend has the same
literal emission before final-use movement. Build that checkout for `--before`.
The baseline core already contains the final-use analysis, but that backend does
not consume it. Final-use movement is the only before/after code-generation change.

All implementations run through one separately compiled C timing driver, without
cross-boundary LTO. Rust and C use the native CPU target; Flecs uses release mode.
There is one discarded warmup and 11 shuffled rounds with seed 104729. Ratios are
median ratios with paired bootstrap 95% intervals. The machine is Apple M2.
Apple Clang and rustc LLVM versions are not established as matching. Single-machine
results do not rank entire products. `initial.json`, `results.json`,
`inline-push.json` and `pre-bulk.json` preserve earlier experiments and their
original protocols; only `final.json` has the final release/bulk-creation controls.

Each cell checks complete face observations, decoded words or all component values
against an independent C oracle before timing. Every measured ECS world is checked
again after its 128 updates. Snapshot comparison/validation is outside timing.
Mesh and codec timings include owned input ingestion, output allocation and
teardown. ECS reports both persistent step time and construction + 128 updates +
teardown. These are typed calls, not JSON transport or durable state transactions.
Output byte counts are payload sizes, not peak allocation measurements.

## Voxels

Both variants emit every visible unit face in a padded cubic chunk: zero is empty,
other words are opaque. Every face includes its voxel coordinates and orientation.
Ink emits one 16-byte face carrier; block-mesh emits 12-byte coordinates grouped by
orientation. Full observations are compared after canonical sorting outside timing.
We compare `visible_block_faces`, not greedy meshing, rendering, lighting, world
streaming or Minecraft. Sizes are 16³ and 32³ interior cells; patterns include
empty, solid, sparse, terrain and checkerboard chunks.

32³ complete calls:

| Pattern | Ink µs | block-mesh µs | Ink / block-mesh (95% CI) |
| --- | ---: | ---: | --- |
| empty | 17.90 | 23.75 | 0.75× [0.75, 0.77] |
| solid | 120.75 | 60.70 | 1.99× [1.97, 2.05] |
| terrain | 99.50 | 50.00 | 1.99× [1.88, 2.03] |
| sparse | 68.90 | 48.60 | 1.42× [1.38, 1.50] |
| checkerboard | 589.20 | 119.00 | 4.95× [4.85, 5.08] |

The knowledge library adds a traversal carrying dimension indices and strides,
which reduces divisions and boundary predicates. It improves solid and terrain
cases about 12–17% over the linear traversal; checkerboard has no measured change.
The algorithms preserve ordered observations in the tests, but no universal
linear-to-strided equality proof is claimed or installed as a rewrite.

Block-mesh uses padded bounds, direct neighbor access and grouped outputs. Ink
retains total `at_or` access and a general scoped buffer carrier. The remaining
populated-chunk gap, especially heavy face output, motivates checked range facts,
better small-loop code generation and reusable/grouped output layouts. Those are
future candidates, not authorised unchecked special cases in a backend.

## ECS

The matched kernel updates `position += velocity` with wrapping u32 values and
preserves velocity for every entity. Ink uses dense two-word records; Flecs uses
separate dense components, a cached query and actual entity IDs. The test sizes
are 1,024, 8,192 and 65,536. Flecs variants use either per-entity creation or
`ecs_bulk_init`. This measures a homogeneous ECS kernel, not dynamic membership,
archetype churn, scheduler behavior or Ink's transactional tables.

| Entities | Ink / Flecs bulk steady step (95% CI) | Prior Ink / new Ink |
| ---: | --- | --- |
| 1,024 | 1.43× [1.33, 1.43] | 1.80× [1.75, 1.80] |
| 8,192 | 2.36× [2.31, 2.63] | 1.83× [1.64, 1.86] |
| 65,536 | 1.39× [1.35, 1.40] | 2.09× [2.07, 2.14] |

The compiler now moves Rust values at their final lexical use. The shared core
analysis assigns fresh identities to shadowed bindings, respects source evaluation
order, keeps captured bindings shared across repeated callbacks, and fails closed
at its resource limits. Source types, effects, errors and observations are unchanged.
This general lifetime machinery also applies to codecs and imported helpers.

The benchmark verifies actual allocation identity: the prior implementation
retains its allocation on 0/3 steps, the new ordinary map and explicit owned map
retain it on 3/3 steps at every size. Rust's normal iterator collection can reuse
this final-use input allocation. The existing database-owned map alternative is
correct but slower on this carrier, so we do not force it into selection. A separate
`Buffer.push` inline-hint experiment was inconclusive and the hint was discarded.
Full lifecycle timings are available, but Ink's small indexed record collection
has fewer facilities to initialise than a Flecs world; no full-ECS speed claim follows.

## Codecs

Compare the same logical u32 words with Ink word RLE, LZ4 block compression and
Zstd level 1. Word RLE and adaptive tagging are distinct formats, not wire-compatible
rewrites of LZ4/Zstd. Inputs include uniform words, 16 runs, voxel terrain columns
and deterministic high-entropy words, at 4,096 and 65,536 words. Native codecs see
the same in-memory word bytes; these measurements are on a little-endian machine.
Record compressed sizes alongside encode/decode times.

65,536 high-entropy words (262,144 input bytes):

| Format | Stored bytes | Encode µs | Decode µs |
| --- | ---: | ---: | ---: |
| ink_rle | 524,292 | 642.47 | 257.66 |
| ink_adaptive | 262,152 | 20.50 | 13.06 |
| lz4 | 263,173 | 13.59 | 8.06 |
| zstd_level_1 | 262,159 | 28.56 | 7.78 |

The new knowledge library counts runs and chooses raw storage when run encoding
would expand the payload. Its explicit tag and length header are validated; unknown
tags, truncated/raw-size mismatches, invalid run counts and output limits are rejected.
Random data avoids the prior RLE expansion and expensive per-word run construction.
The counting pass adds cost on compressible data, so the original RLE API remains
available. Regular-data RLE encoding also benefits roughly 4–5× from final-use movement.

RLE can win on uniform/repeated words, but LZ4/Zstd compress less regular data much
better. For terrain columns, Zstd's much smaller payload must be considered along
with time. Future database alternatives should include bit packing, palettes, block
framing and early raw fallback. Native-format compatibility needs explicit validated
codec semantics; benchmark ratios cannot grant rewrite authority.

## Architecture and validation

The algorithms live in the independently pinned knowledge package. Precise point
cache discovery was moved into its source-bound planning recipe when integrating
the newer database-planning branch. Both snapshots' immutable laws are retained;
all 48 existing bulk laws are checked and a rehashed false length law still rejects.
Only generic lexical lifetime facts live in core; Rust literal emission consumes
those facts. No trusted voxel, ECS or codec matcher, runtime profitability probe,
new proof rule or language grammar was introduced.

Core's full standalone suite passes. Mandatory generic-library conformance checks
include aliasing, shadowing, branches, repeated/parallel captures and all previous
bulk observations. The new workload suite validates 40 observations on reference,
C, Rust, JavaScript, C-Wasm, Rust-Wasm and wgpu host execution, with real eligible
numeric dispatch and explicit rejection of unsupported required-GPU work. GPU host
fallback does not establish device mesh/codec support. Database-plan integration
and exact independent package-pin checks are recorded in the accompanying evidence.
The point-cache tool also replays automatic recipe discovery, rejects forged access
and fully reauthenticated false retention, and checks the watched-key mechanism.

## Source inspection and next work

The inspected upstream mechanisms explain where to focus generic machinery:

- [block-mesh's padded-grid traversal](https://github.com/bonsairobo/block-mesh-rs/blob/6194e3580f826eefcc905dfa2386460a403396f7/src/simple.rs) computes face neighbor strides, uses unchecked reads after establishing interior bounds, and groups coordinates by orientation. Its buffer supports clearing and reuse. Ink should pursue checked range/lifetime capabilities and reusable output layout choices; the compiler should not recognise “a voxel loop”.
- [Flecs queries](https://www.flecs.dev/flecs/Queries.html) cache matching tables and iterate component arrays. Its bulk initialisation API is used in the final control. Component layout and membership maintenance should be checked database representations, with steady updates and structural churn benchmarked separately.
- [LZ4's compression loop](https://github.com/lz4/lz4/blob/8aba903e7260c8d5a1ffb94405d72d1ee77ce317/lib/lz4.c) hashes byte positions, searches prior matches, and increases the search step on incompressible inputs. It exploits repeated substrings beyond runs of identical words. This points to general packed byte access, match search and block algorithms in knowledge, rather than a codec-specific trusted primitive.
- [Zstd 1.5.7 compression](https://github.com/facebook/zstd/blob/f8745da6ff1ad1e7bab384bd1f9d742439278e99/lib/compress/zstd_compress.c) includes raw-block fallback; its fast matcher and sequence encoder combine match search with entropy coding. The current inspected checkout also records a newer development head, but the linked benchmark library is 1.5.7 and this release source was inspected separately. The new adaptive word format adopts the general non-expansion idea, not Zstd's wire format or compression algorithm.

The strongest next generic targets are checked bounds for indexed reads; direct
owner/reusable buffer representations where lifetime capabilities allow them;
and packed component/byte layouts with checked encode/decode boundaries. Ownership
analysis belongs in general checking; discovery, layout alternatives, algorithm
variants and ranking remain database/planner work. Profiles rank already valid
alternatives. They never justify dropping checks or changing a format.

# Bulk buffers for voxel, codec and ECS workloads

Ink now has two general owned-buffer range operations. They use existing method
syntax; no new grammar, voxel primitive, codec dispatcher or ECS scheduler is
introduced. New operations bind `ink-executable-core-v9`. Unchanged programs keep
their previous executable identities; replay rejects an older version on a module
that uses these operations.

| Operation | Fixed value meaning |
| --- | --- |
| `b.fill_range(start,count,value)` | Replace up to `count` slots from `start`, clipped to this owner's length |
| `b.copy_within(source,destination,count)` | Copy up to `count` original slots, clipped at both ends, into this owner |

Both consume and return the affine owner. Length never changes. Out-of-bounds
starts and zero counts perform no writes. Indices/counts are `u32`; bounds use
subtraction after clipping, so `u32::MAX` cannot wrap a range into earlier slots.
Arguments retain ordinary eager, left-to-right evaluation. Copies have snapshot
semantics even when ranges overlap. In particular, they are not LZ's expanding,
forward backreference operation. Elements are ordinary immutable values; nested
owners remain rejected.

Native typed support edits the existing allocation. Copying chooses a safe
forward/backward traversal without a temporary slot array. JavaScript uses
`Array.fill` and `Array.copyWithin` on bounded logical views. Split owners cannot
write neighbouring partitions. The independently implemented reference evaluator
uses a temporary snapshot for copying. Complete C and both Wasm lanes embed the
shared native primitives. Opaque C execution charges work proportional to copied
value weight; bulk operations cannot evade its execution budget. Typed native
allocation and scheduling retain their existing host policies.

These new range operations execute on the CPU, including GPU-host fallback.
Required-GPU requests fail explicitly. The validation fixture also executes an
independent eligible numeric array kernel on a real wgpu device. This is not
GPU acceleration of voxel painting, compression or ECS mutation.

## Ordinary algorithms in the knowledge repository

`knowledge/libraries/buffers.ink` supplies generic stable range removal and gap
insertion. Gap insertion has an explicit maximum length and refuses over-capacity
growth. Its repeated pushes remain ordinary source, not a new allocator primitive.

`voxels.ink` paints clipped boxes in dense chunks with x-fastest addressing. It
performs one bulk fill per affected row. Dimension validation prevents stride
multiplication overflow; complete planes define the depth and trailing partial
planes remain untouched. Invalid dimensions preserve the input.

`codecs.ink` provides a word-stream run-length encoder/decoder and canonical
packing/unpacking of byte values into little-endian u32 words. Both formats start
with their decoded logical length. Decoders accept an explicit maximum and reject
malformed framing, zero/oversized runs, incomplete expansion and nonzero padding.
Packing rejects byte values above 255. These are ordinary source algorithms.
`List<u32>` is the transport: packed byte streams contain four octets per payload
word, but this does not add a `Bytes` type or a zero-copy external byte ABI.
Run-length encoding can expand high-entropy inputs.

`ecs.ink` supplies typed entity/component columns, paired stable row removal and
sparse gathering in requested entity order. Gathering rejects length mismatch and
ambiguous duplicate component IDs and returns None for missing components. It
builds a local map per call; native scalar maps can use existing dense scratch,
while other cases retain ordered fallback. This is not a persistent archetype
engine, retained join cache or a parallel system scheduler.

## Checked optimisation business logic

`knowledge/producers/bulk_buffer_laws.py` publishes 48 context-free laws across
u32/u64/i32/f32/Bool/String/Int/Unit. They establish zero-count and empty-buffer
identities, plus general fill length preservation by quantified list induction.
Eight operational helpers supply the induction proofs; forty source-facing laws
are installed as discovery roots. There is no new proof rule or privileged
algorithm name. Fixed extensional meanings live in core; algorithms, equalities,
proof tactics and discovery entries live in the independently pinned knowledge
repository. The existing planner discovers applicable laws and the existing core
rechecks selection. There is no new planner or runtime profitability policy.

These proofs do not establish generic codec roundtrips, voxel invalidation, ECS
join correctness or backend correctness. The implementation tests independently
check those fixture results. Unsupported semantic projection continues to fail
closed. Profiles can rank admitted alternatives; they never establish validity.

## Evidence and reproduction

The core tests compare clipped/overlapping copies and fills with independent
snapshot oracles, reject forged version/type/ownership artifacts, check resource
exhaustion, and compare concrete kernel definitions with those oracles. Native
support tests check retained allocation identity and scoped writes. The mandatory
`generic_libraries` suite includes the workloads and checked selections.

79 pure/action observations agree on C, Rust, JavaScript, C-Wasm, Rust-Wasm and
wgpu host/device execution, including malformed input, raw float payloads,
rollback, ordered events, exact checkpoints and restored continuation. The
separate selected fixture agrees across all five CPU targets and the wgpu
backend, and proves that
unobserved filling and zero-count copying/filling can be eliminated. A rehashed
false general length law is rejected by mathematical checking.

```sh
cargo test --manifest-path core/Cargo.toml --offline --lib --test bulk_buffers
cargo test --manifest-path native-support/Cargo.toml --offline --test typed
INK_PARITY_REQUIRE_ALL=1 INK_TEST_ZIG=/path/to/zig INK_TEST_WGPU=1 \
  cargo test --offline --test generic_libraries voxel_codec_ecs -- --nocapture
INK_PARITY_REQUIRE_ALL=1 INK_TEST_ZIG=/path/to/zig \
  cargo test --offline --test generic_libraries bulk_database_selection -- --nocapture
cargo test --offline --test generic_libraries bulk_laws
python3 bench/bulk-buffers/run.py
```

The native Rust benchmark includes input copying, output allocation and release.
Nine interleaved rounds compare bulk Ink, scalar Ink and handwritten Rust using
the same owned call interface at 1,024/16,384/65,536 cells. The Rust controls
reuse their owned inputs directly where permitted; they are not forced to perform
Ink's internal copies. Recorded scalar/bulk median ratios are
3.04–3.26 for box painting,
13.8–47.9 for run decoding and
4.53–5.43 for column removal.
Bulk Ink ranges from 0.958 to 3.75 times handwritten Rust execution
time. It approaches the control for larger run decoding, while copying and
call overhead still make painting and column movement substantially slower.
The results do not establish complete voxel-engine/ECS performance, general codec
superiority, or profitability of automatically replacing arbitrary scalar loops.
See [the exact benchmark](../bench/bulk-buffers/results.json) for samples, input
sizes, source/dependency/compiler identities, environment and separate build costs.

Sparse spatial layouts, region dependency proofs, parameterized maintained
queries, persistent ECS/archetype layouts, generic byte transport, vectorized
compression kernels and device range execution remain separate capabilities.

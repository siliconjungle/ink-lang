# Indexed calls, inverse journals and database candidate selection

These measurements identify two separate performance issues: ordinary C/JS hosts
copied whole tables per call, and existing checked list-based cached layouts
have expensive writes. The first is fixed by generic inverse-journal transaction
machinery. The second requires comparing implementations without privileging a
cached layout. Selection happens in the external planner over database entries;
no source-versus-cache recogniser or choice branch is added to the compiler.

The timing artifacts below were produced before the subsequent executable-core V8 integration. Their recorded compiler/support hashes define the claims; regenerated V8 proof packages do not inherit those measurements. Current conformance is checked separately.

## Matched before/after point calls

`examples/point-query-delta.ink`, 4000 restored rows, 1000 calls per timed batch:

| Lane and call | Before ms | After ms | Ratio |
| --- | ---: | ---: | ---: |
| JavaScript writes | 201.373 | 0.528 | 381.3× |
| JavaScript queries | 0.423 | 0.396 | 1.07× |
| Native C writes | 92.942 | 6.417 | 14.48× |
| Native C queries | 94.490 | 6.341 | 14.90× |
| C-Wasm writes | 112.472 | 7.989 | 14.08× |
| C-Wasm queries | 130.305 | 13.591 | 9.59× |

C's shared primitive host no longer clones all tables before each call; writes
record old values for rollback, and borrowed action descriptors avoid metadata
copies. JavaScript change calls no longer clone every Map; writes record inverse
entries, with reverse replay on abort. JavaScript queries already avoided table
copies. Rust/Rust-Wasm already used inverse journals, so this is not a claimed
speedup for those lanes. The corresponding native/browser GPU hosts inherit the
support changes; recursive table state runs on the CPU, with no device speed claim.

Release compilation, initialisation, restore and checkpoint are outside the
steady-state intervals. Native C includes ctypes handle/buffer ownership, JSON
transport/parsing and replies; C-Wasm includes the existing Node/Wasm host boundary.
JS measures synchronous invoke and replies. Compare before/after within each row;
these different boundaries do not justify an absolute cross-language ranking.
All rounds compare replies and exact portable snapshots. JS and C-Wasm use nine
alternating paired rounds; C uses three alternating process pairs, nine rounds
per process. Shared-machine noise remains a limitation. No peak memory claim.

The allocator regression test measures 100 get/put calls at 64 and 4000 rows:
reads allocate 300000 bytes at either size; writes allocate 304200 bytes at either
size. JavaScript copies zero table entries for the corresponding point calls.
These checks establish removal of whole-table copies, not allocation-free calls.

## Ordinary Rust versus an existing cached representation

`examples/filtered-aggregate.ink`, 100 calls per interval, nine samples per cell,
three process runs with reversed workload order in the middle run. Table below
uses the median of the process medians for the `sum-delta` candidate. All generated
variants, the reference evaluator and handwritten controls produce the same
replies and final portable state. Timing includes JSON invoke/reply/events and
acknowledgement; checking, compilation, setup and migration are outside intervals.

| Rows | Reads | Cached ms | Ordinary indexed ms | Faster implementation |
| ---: | ---: | ---: | ---: | --- |
| 256 | 0% | 3.578 | 0.071 | ordinary, 50.1× |
| 256 | 90% | 0.388 | 0.082 | ordinary, 4.75× |
| 256 | 99% | 0.068 | 0.082 | cached, 1.20× |
| 256 | 100% | 0.025 | 0.080 | cached, 3.27× |
| 4000 | 0% | 54.452 | 0.081 | ordinary, 670.2× |
| 4000 | 90% | 5.716 | 0.779 | ordinary, 7.33× |
| 4000 | 99% | 0.714 | 0.857 | cached, 1.20× |
| 4000 | 100% | 0.027 | 0.846 | cached, 30.95× |

This compares different existing implementations, not a new indexed maintained
representation. The maintained handwritten control remains much faster on mixed
workloads (see raw results). Rust evidence cannot select another lane's layout.
Frequency and lifetime matter, but setup, update, migration and memory need their
own comparable evidence. The selector integration uses synthetic costs to test
policy; those synthetic observations are not these benchmark measurements.

## Reproduction and retained artifacts

- `run-1.json`, `run-2.json`, `run-3.json`: matched Rust scaling and controls.
- `javascript-undo.json`, `c-wasm-undo.json`, `c-undo-{before,after}{,-2,-3}.json`:
  point-call samples and checksums.
- `summary.json`, `provenance.json`: reductions, source/support versions and hashes.
- `javascript-{before,after}.mjs.txt`, `c-host-{before,after}.rs.txt`,
  `literal-program.c.txt`: actual generated program/support bytes.
- `allocations.jsonl`, parity logs and `selection-and-proofs.log`: local checks.

Run the ignored `benchmark_standalone_aggregate_scaling` point_delta test to
produce the standalone Rust benchmark. Point-call scripts are
`tools/bench_indexed_undo.mjs`, `.py`, and `_wasm.mjs`; their command-line arguments
select the emitted projects/modules. The before C project uses the previous
native-support dynamic template with otherwise identical emitted C code.

The mandatory point_delta suite checks real database candidates, measured
lifecycle policy, exact pinned replay, corruption/proof rejection, evidence
isolation for all seven lanes and independent Lean models. Transaction parity
covers repeated keys, multiple roots, nested changes, retained rows, rollback,
ordered events and exact snapshots, with actual eligible GPU work separately.
Lean proves the functional inverse-journal model and minimum supplied lifecycle
cost among eligible candidates. It does not prove the Python/Rust implementations,
backend correctness or future time. Full hosted conformance remains the merge gate.

# Checked physical capabilities

The optional `inline_functions` choice names sorted, unique functions in the
exact source image. Rust and Rust/Wasm place native `inline(always)` hints on
their owning and borrowed methods. Other targets reject this choice. Empty
hints serialize exactly as before; Ink syntax and executable semantics do not
change. The hints confer no source equality or invariant, and the target compiler
may decline to inline. Knowledge proposes hot helpers using untrusted call counts
and carrier estimates; ordinary offline measurements decide whether to select
them. Correctness and target-admission checks passed. The tested CRDT candidates
were slower on training workloads and were rejected by normal planning. The
producer remains optional and is excluded from the default recipe registry.

Ink can now select direct vector ownership, source-proved reads without bounds
checks, and dense or packed columns for ordinary lists of scalar records. The
knowledge database supplies the proofs and alternatives. The language syntax and
logical JSON, codec streams and portable state snapshots are unchanged.

## Separation of responsibilities

The core exports exact source obligations and fixed codec meanings. It replays
RUP certificates for word bounds, ordinary semantic equality for unchanged map
fields, and inductive equality for the row/column round trip. It contains no SAT
solver, workload recogniser, optimisation law selection or profitability policy.

`knowledge/producers/physical_capabilities.py` performs bounded proof search and
constructs physical plans. `carrier_fusion.py` proposes checked map composition
and ordered map/reduction for arbitrary admitted element and result carriers,
including nominal records. Its beta reduction is untrusted; the kernel checks the
resulting induction proof. These producers are discovered through database recipe
and producer catalogues. Generic codec, packing and fusion proofs are published
in the database; source-specific capabilities require the complete consuming plan.

Rust emission consumes sealed capabilities. An unchecked access is authorised for
one function/child path in one complete source module. Aliases retain their
numeric type, U32 arithmetic wraps before comparisons, shadowed binders remain
distinct, and signed/float predicates do not become unsigned premises. Unknown
facts remain unavailable. Literal finite loops and explicit branches supply
control-flow premises; a `map_indexed` counter is not assumed smaller than a
potentially wrapped list length. Lazy fallbacks remain lazy.

A checked layout binds the actual scalar fields and the exact encode/decode
functions implemented by storage. Columns have private, equal-length fields.
Map execution reads a complete original row before applying changes; a column
write is skipped only with an independently checked field equality. Captured
immutable collections retain their original snapshots through lexical last-use
checking and cloning when required.

Direct Option/Result `fold` branches execute at most once. Rust lowering can
move a captured value on its last use in the selected branch, including the
continuation produced by `?`. Later uses retain copying, independent record
fields may move separately, and repeated or escaping callbacks keep their
captures shared. This is lexical ownership analysis of the existing source;
it adds no syntax, algebraic law or domain-specific compiler behaviour.

A parameter loan permits borrowing without requiring it at every call. If all
eligible actual arguments are computed owning values or final lexical uses,
Rust calls the owning entry point. This lets a helper transfer its result
without copying an aggregate through a borrowed formal. Shared bindings and
active sibling loans retain the borrowed call and their original lifetimes.

Preferred 8/16/32/64-bit word lanes promote to their full source width when a
value does not fit. Booleans use individual bits; I32 and raw F32 stay in plain
columns. Packing does not change the public wire format. Column split, drain,
sort and parallel transport currently materialise rows where necessary. Direct
Buffer split creates independent owners; allocation identity is not observable
in Ink. Dense and packed choices need measurement, including ingestion and output
conversion, before automatic selection.

## Use and scope

```sh
PYTHONPATH=knowledge python3 -m producers.physical_capabilities \
  examples/physical-capabilities/main.ink --record Particle --bits 8 \
  -o build/physical-plan
ink check-physical-plan examples/physical-capabilities/main.ink \
  build/physical-plan/physical.json
ink emit-plan examples/physical-capabilities/main.ink \
  build/physical-plan/plan.json --target rust-wasm -o build/physical-program
```

The producer requires the declared `python-sat==1.9.dev5` dependency. Pass
`--compiler` when using a specific compiler. Use `--bits 0` for plain columns or
`--no-bounds` for a layout-only ablation. `@U32`, `@U64` and `@Bool` select scalar
list carriers; these are physical-plan names, not source syntax. Flat records
have 1–16 Bool/U32/U64/I32/F32 fields. Other carriers retain literal execution.
Proof-search and checker resource limits are explicit and fail closed.

The specialised plans currently execute on Rust and Rust/Wasm. C, JavaScript,
C/Wasm and GPU hosts reject these selected physical strategies; their baseline
logical programs continue to execute. GPU conformance includes actual eligible
numeric dispatch, separately from host fallback. This does not implement a full
voxel engine, an archetype ECS, or a replacement for LZ4/Zstd.

## Verification and evidence

`core/tests/physical_capabilities.rs` checks valid and forged/rehashed bounds,
wrong layouts, false round trips, false unchanged-field statements, stale source,
and rewrite/layout composition. Native storage tests compare clipped overlapping
copies, partitions, snapshots, promotion thresholds and bit boundaries with
independent oracles. `tests/physical_capabilities.rs` compares native and Wasm
selected plans, then all baseline CPU backends and the wgpu host, including raw
float payloads, maximum words, empty arrays, state outcomes and exact checkpoints.
The composed fusion/column/bounds plan is executed against the same oracle.

`bench/physical-capabilities/run.py` runs physical ablations against the existing
real block-mesh, Flecs, LZ4 and Zstd harness. `fusion.py` measures checked record to
scalar fusion. Both use separate C drivers, release native CPU compilation,
complete output validation, 11 interleaved rounds and paired bootstrap intervals.
The reports record source, compiler and package identities. Storage footprint,
setup and persistent execution are different costs; a smaller layout need not be
faster. See the result discussion below for the measured limits.

## Measured results

These are exact-plan ablations on the captured Apple M2 environment. Ratios below
are selected/baseline time; smaller is better. Inputs and full outputs are matched.
Absolute timings vary with machine load, and the dense ECS confidence interval is
wide. These results do not establish a general product ranking.

| Choice and workload | Median ratio | Paired 95% interval |
| --- | ---: | --- |
| Direct Buffer, 32³ checkerboard faces | 0.300× | [0.286, 0.303] |
| Direct Buffer, 32³ solid faces | 0.818× | [0.813, 0.894] |
| Dense columns, 65,536 entity updates | 0.604× | [0.357, 0.988] |
| Packed columns, 65,536 entity updates | 13.164× | [12.904, 14.157] |
| Direct Buffer, 65,536 random-word adaptive encode | 0.034× | [0.031, 0.037] |

The direct buffer also removes scoped ownership overhead from the surface
iteration used by the adaptive codec. The large adaptive encode ratio is against
the current scoped plan of the same compiler; it is not a comparison with a
historical report or with the compression format used by LZ4. Codec sizes and
real-library timings remain separate rows in `results.json`.

The real block-mesh comparison still favours block-mesh on populated chunks.
Dense columns close much of the measured homogeneous ECS kernel gap with Flecs;
archetype churn, dynamic membership and scheduling are outside this benchmark.

The packed particle payload is 327,680 bytes versus 524,288 for dense/AoS at
65,536 entities, excluding container metadata, unused capacity and transient
conversion allocations. Its update cost is much worse, so it is an alternative
for appropriate data/usage profiles rather than a default fast layout.

The four admitted bounds sites in the competitive program are codec header
reads. This bounded producer does not establish the voxel neighbor bounds through
the opaque quotient guards. The bounds ablation includes direct buffers; its
voxel improvement must not be attributed to unchecked neighbor reads.

At 65,536 rows, checked record map/map and record map/fold fusion lifecycle ratios
are:

- record_map_map: 0.982× [0.980, 0.985].
- record_map_fold: 1.085× [1.079, 1.088].

These include row ingestion and output destruction. Fusion removes the
intermediate source traversal/allocation, but the host compiler already optimises
some literal stages and changed traversal shapes can reduce vectorisation. No
universal runtime speedup is claimed. Automatic physical planning continues to
retain the baseline when comparable lifecycle evidence is absent.
# Function-scoped parameter loans

Rust and Rust-Wasm plans may name an immutable parameter through
`physical::parameter_read_site(function, parameter)`. The canonical site binds
the capability `ink-parameter-read-v1`, the exact function name and its parameter
name. The module checker admits only actual nonrecursive List or record
parameters without affine Buffer/Map contents. Rehashing a packet does not admit
a missing, scalar or affine parameter.

These sites occupy the existing sorted `borrow_reads` list. Legacy lexical read
sites retain their meanings. A scoped site for `read(x)` does not also borrow
`transfer(x)`. The public owning ABI stays intact; eligible internal calls use a
borrowed implementation. Public functions with no affine arguments or result also
export that safe Rust entry as `ink_borrowed_function_l_NAME`, so native library
callers can retain a document while querying or saving it without cloning its
owning value. Wire/native C entry points keep their existing owning signatures.
Immutable field observations through an already
borrowed binding share that lifetime. Computed arguments and projections from
affine owners are first materialised as ordinary owning temporaries, then lent
for the synchronous call. This preserves argument evaluation order and lets
other arguments remain borrowed. Conflicting lexical loans still prevent moves.

`producers.readonly_borrows.scoped_candidates` proposes bounded alternatives from
generic read-use analysis. It excludes aggregate transfers into working storage
and follows read-only callees to a least fixed point. This analysis ranks
proposals; typed source checking and Rust lifetime enforcement remain separate.
There is no CRDT-specific compiler rule or new source syntax.

`physical::expression_read_site(function, expression)` separately binds a lexical
observation to its function and expression identity (`ink-function-read-v1`).
The checker admits only existing typed projections rooted in a List or record.
This permits borrowing a local collection for a traversal or lookup while a
later final use still moves the collection. It does not make the function's
parameter borrowed, change the owning ABI, or establish a mutable loan. Existing
alias and lifetime checks continue to apply. The read site authorises an
implementation choice; measurements still decide whether to select it.

Literal Rust and Rust/Wasm field observations of `rows.at_or(index, fallback)`
copy the selected field without cloning the complete row. Both ordinary lists
and native buffer owners support this access. The lookup finishes its storage
borrow before evaluating a missing-row fallback, so a fallback can mutate a
disjoint scoped range safely. The complete fallback record is evaluated before
its field is moved. Affine rows, physical columns and indices referencing the
receiver's root retain the existing access path. This introduces no capability,
source syntax or semantic rewrite. Cross-backend outcomes, fallible preparation,
partition mutation and actual row-clone counters are covered by
`tests/projected_item_fields.rs`.

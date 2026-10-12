# Slice proofs and offline selection

`take` and `drop` already execute in Ink. They now have typed semantic terms
and fixed constructor evaluation in the equality checker. Counts are `u32`.
Zero takes an empty list or drops nothing; a count beyond the length clamps at
that length. The nonzero constructor branch alone decrements the count, so
`u32::MAX` does not create an unguarded underflow. This extends the admitted
term domain without changing existing primitive behaviour or proof formats.
Older compilers reject the newly admitted operations.

The kernel does not know the optimisation. Three independently checked law
families live in `knowledge/producers/list_slice_laws.py`:

- Move a take ahead of a pure map.
- Move a drop ahead of a pure map.
- Join a take and the corresponding drop to reconstruct the original list.

The publisher checks 105 universal input/output type instances, then publishes
canonical immutable entries. A snapshot can enable an installed semantic producer
with a `definition` entry using `ink-semantic-producers-v1` and payload
`{"module":"producers.list_slice_laws"}`. Discovery reads the explicit snapshot.
The producer instantiates observed types and binds nominal declaration contexts;
each proposed law and dependency still needs ordinary kernel admission. Registry
membership, source names, timing and target choice confer no proof authority.

Publish into an existing knowledge checkout:

```sh
PYTHONPATH=planner:knowledge python3 -m producers.list_slice_laws \
  --compiler target/release/ink --knowledge-root knowledge \
  --report build/list-slice-publication.json
```

The public compiler also accepts an offline measurement workload:

```sh
ink compile program.ink --optimise knowledge --target javascript \
  --measure-workload workload.json -o program.mjs
```

A minimal workload is:

```json
{
  "schema": 1,
  "phases": {"call:run": [{"function": "run", "args": [[1, 2, 3], 1]}]},
  "profile": {"call:run": 100},
  "workload": {
    "shape": {"rows": 3},
    "distribution": "representative selection inputs",
    "concurrency": 1,
    "residency": "captured inputs; owned result"
  }
}
```

Each phase measures the complete sequence of supplied calls and consumption of
all output values. Profile weights count repetitions of that sequence. Acquisition
emits admitted candidates, compares outputs with the independent reference,
checks input preservation, and collects nine interleaved timing batches. Compilation,
reference execution and module loading are reported separately. Immutable
observations bind the candidate, compiler, backend, host, Node/adapter versions,
phase and exact selection-input bytes. The existing lifecycle ranker chooses from
comparable observations. A selected plan receives fresh proof replay before emission.
Without evidence the compiler retains its baseline. Runtime does no profitability
probing. Selection inputs are training data; evaluating generalisation requires
separate programs and inputs.

The initial installed acquisition adapter covers serial pure JavaScript calls
with JSON-compatible scalar/list/vector/record descriptors. It explicitly refuses
state lifecycles, other backend ABIs, exact `u64`/`Int` transfer and migration.
Other backends and state plans can still use existing externally supplied lifecycle
observations. This adapter does not change adaptive routing or restrict the compiler's
emission targets. Its observations have unknown peak memory; a hard measured-memory
constraint cannot be satisfied with them. Heap/RSS sampling in experiments is a
separate measurement with its own limits.

Validation includes adversarial law/count typing, snapshot isolation, false output
and mutation rejection, measured public-compiler selection, independent boundary
inputs, and selected C/Rust/JavaScript/both-Wasm conformance. These checks do not
prove backend correctness or establish a blinded performance result.

## Generic templates and discovery scaling

Knowledge can also publish `ink-semantic-law-template-v1` authoring entries.
Their payload contains `type_parameters`, an ordinary `law`, and a dependency
label map. A placeholder such as `{"Named":"$A"}` is replaced by an observed
source type before admission. It is not a new executable Ink type or a trusted
proof rule. Matching infers type bindings from terms; nominal instances bind
portable declaration contexts. Dependency labels become concrete content IDs.
Every resulting ordinary law still goes through the same kernel.

The disposable index tracks typed pattern heads and heads introduced by rule
outputs. Discovery follows that reachability relation, including wildcard roots,
so a new intermediate operation can unlock a later rule. Old indexes use a
conservative fallback and refresh migrates them. Membership witnesses are shared
per authenticated leaf and the cache retains at most sixteen recently used
snapshot memberships; old canonical snapshots remain readable after eviction.
Indexed coverage is labelled as untrusted diagnostics. Canonical audits remain
available separately, and selected proofs retain ordinary membership validation.

Discovery reuses authenticated object reads and creates a stable ephemeral
membership tree for its proposals. Only a requested dependency closure's bodies
are transported to the checker. Unused discovery entries are not admitted merely
because their IDs occur in that tree. Incremental admissions keep the same
transport root, and every selected application and final plan still replay.
The planner attempts the first available edge of a family before spending time
on later recipes; remaining edges retain round-robin scheduling.

The experiment reports complete compilation costs, execution, sampled memory,
selection misses and regressions separately. Its short-budget curve and later
wider-budget diagnostics answer different questions. A valid law can improve
execution while remaining undiscovered under a compilation deadline. Catalogue
object count includes typed instances and proof supports; it is not a count of
independent useful algorithms.

Planning effort and live producer scheduling are documented in
[`ink-planner/docs/search-scheduling.md`](../planner/docs/search-scheduling.md).
`--planning-effort thorough` explores a wider set of checked implementations;
explicit time, attempt and state flags remain available. The proof and measurement
gates described above remain in place.

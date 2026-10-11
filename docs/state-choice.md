# Database implementation selection

Implementations and layouts are database entries. The compiler has no special
source-versus-cache selector or implementation-name recogniser. The external
planner compares supplied entry IDs and feeds the winning proof package into
Ink's existing checking and literal lowering interfaces.

An `ink-implementation-candidate-v1` implementation entry contains `package`:
any supported checked-selection or universal representation package. Its
ordinary-source candidate is an empty `ink-evidence-v1` selection, published as
data by the knowledge producer. It has the same admission and measurement rules
as other candidates. The caller supplies the baseline ID; a representation can
also be the baseline. The generic protocol adapters distinguish proof formats,
not table algorithms. Entries cannot supply executable commands.

For example, publish ordinary point-query code and the existing maintained
representation into an experiment database:

```sh
ink emit-core examples/point-query-delta.ink -o core.json
# Use the core_sha256 printed above as CORE_SHA256.
python3 knowledge/producers/implementation_candidates.py \
  --knowledge-root experiment-db --identity-source CORE_SHA256 \
  --package knowledge/research/point-delta/delta.json
# Use the printed candidate IDs as BASELINE_ID and in candidates.json.
PYTHONPATH=planner:knowledge python3 planner/select_implementation.py \
  --compiler /absolute/path/to/ink --source examples/point-query-delta.ink \
  --baseline BASELINE_ID --emit-target rust --candidates candidates.json \
  --knowledge-root experiment-db --target target.json --workload workload.json \
  --profile lifetime.json -o selected.json
PYTHONPATH=planner:knowledge python3 planner/select_implementation.py \
  --compiler /absolute/path/to/ink --source examples/point-query-delta.ink \
  --emit-target rust --knowledge-root experiment-db \
  --replay selected.json -o generated.rs
```

The producer preserves existing objects and names when extending a publication.
It imports package dependencies and publishes authenticated membership, but
publication grants no proof authority. The planner checks every package before
ranking it. `selected.json` is the existing proof-package format, accompanied by
an external `.selection.json` receipt. Replay checks exact source, compiler bytes,
emission lane, candidate membership in the recorded immutable snapshot, and
package bytes, then rechecks proofs before invoking the existing emitter. A newer
database pointer does not change a frozen choice. The pinned database is needed
at this build step; its index and the producer are unnecessary for proof replay.
Proofs, profiles and choice receipts are build artifacts, never runtime state.

All seven lanes use the same candidate protocol: `rust`, `c`, `javascript`,
`rust-wasm`, `c-wasm`, `wgpu`, `webgpu`. Rust/JavaScript emit source files;
C and Wasm emit projects; ordinary GPU emission uses the existing bundle builder
and its toolchain requirements. Representation WebGPU emission produces a module.
These differences are existing artifact/host contracts. GPU device eligibility
and measured placement remain distinct from recursive state on the CPU host.

## Comparable lifecycle evidence

`measurement_id(candidate, compiler_sha256, emission_target)` hashes the canonical
`ink-implementation-measurement-v1` descriptor for every candidate. Hardware,
driver, toolchain, boundary, workload shape/distribution, concurrency and residency
must also match the observation. Measurements cannot transfer between compilers,
candidates or lanes. Shape is evidence provenance; it does not itself prove a
specialisation applicable to arbitrary input.

The lifetime profile counts `check`, `compile`, `initialise`, `teardown`, and named
`action:NAME` phases. Each nonzero phase requires comparable observations for that
candidate. Count setup/compilation when choosing a fresh program; a restored
program can explicitly describe steady-state work. Missing baseline evidence and
ties retain the supplied baseline; missing candidate phases exclude that candidate.
Optional memory limits require measured peaks for every required phase.

`--migration-count N` charges explicit portable checkpoint/restore observations
under `migrate:BASELINE_MEASUREMENT:portable:CANDIDATE_MEASUREMENT`. Packages must
preserve the same original source snapshot contract, checked by their existing
proof protocols. This is an external build-time choice, with explicit migration;
there is no autonomous runtime profiling or speculative action execution. The
representation-only selector retains its checked direct-bridge interface.

`Selection.lean` proves minimum supplied cost among eligible candidates, baseline
retention without evidence, strict tie handling and the savings amortisation
inequality. `Undo.lean` proves reverse journal rollback for arbitrary histories.
Neither model proves future speed, the measurement system, Python/Rust compiler
correctness or a new indexed maintained representation. Existing persistent-list
candidates remain controls; competitive new layouts need database definitions,
universal preservation proofs and their own target measurements.

Shared candidates may replace embedded `knowledge` with
`knowledge_ref: {"schema":1,"roots":[...]}`. Roots must be sorted, unique and
exactly match the candidate dependencies. The selector exports and authenticates
the complete pinned view before ordinary checker replay; the emitted frozen package
still contains that complete view. This saves database duplication, not checking.

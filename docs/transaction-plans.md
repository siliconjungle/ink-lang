# Transaction plans: proposed package contract

Status: **proposal with a measured prototype**. Nothing here is implemented in the
compiler, and no plan is selected by built-in recognition. The prototype in
[reports/txn-plan-prototype](../reports/txn-plan-prototype/REPORT.md) is hand-written
Rust for one program, used only to measure what the plans are worth.

## Why

Every generated change currently runs the generic journal protocol:

- read the row as a clone
- write through `set_*`, which looks the key up again and pushes an undo record
  holding the old row and cache values
- stage events in `staged`
- on commit, check the commit sequence, clear the undo log, and copy the staged
  events into the outbox

That protocol is the correct base: it implements abort for any action shape.
For many actions most of it is dead work. Removing that work changes how the
action executes, so under AGENTS.md it belongs in a knowledge package with
checked evidence, not in a new compiler recogniser.

## What a plan must preserve

A plan replaces the *top-level* execution of one source change. Nested calls keep
using the journaled base. Against the journaled reference execution it must
preserve every observation:

1. **Result.** The returned value, including the error variant.
2. **Commit.** On success the version increments by one. The post-state equals the
   reference post-state for every table, and for every maintained value / cache.
3. **Abort.** On `Err` the state, caches, version and outbox are unchanged.
4. **Events.** On commit the published events are the reference events in order,
   with coordinates `(commit, position)`. On abort none are published.
   `OutcomeView.events` is the committed suffix.
5. **Commit-sequence exhaustion.** If `version == u64::MAX` and the body succeeds,
   the reference rolls back and returns `Err("commit sequence exhausted")`. A plan
   either has a runtime guard that falls back to the journaled base when
   `version == u64::MAX`, or reproduces that behaviour.
6. **Tentative reads.** Reads and derived values read within the action see the
   action's own uncommitted writes, exactly as in the reference.
7. **Transaction boundary.** No partial state is observable between invocations.
   `checkpoint` keeps requiring an empty journal, and snapshots taken after the
   plan's commit equal the reference snapshots byte for byte.
8. **Scope.** Host failures (allocation failure, process abort) are outside the
   observation domain, as for the existing total-value proofs. A plan must state
   this, and must not claim more.

## Plan shapes measured by the prototype

### P1: validated direct execution

*Applicability.* Every failure point of the body precedes its first effect. A
failure point is `return Err`, `?` on a fallible value, or a call to a change
that can fail. An effect is a table write, an `emit`, or a call to a change that
writes.

*Guard.* `version < u64::MAX` at entry. Otherwise run the journaled base.

*Execution.*
- no undo records
- a single lookup per touched key: `entry` for insert-if-absent, `get_mut` for
  read-modify-write
- cache deltas applied with the same delta laws the maintenance package proves
- events pushed straight into the outbox with their final coordinates
- the version incremented only on success

*Evidence.*
- (a) A control-flow certificate over the checked core IR: no failure point is
  reachable after the first effect. Checking it needs only the core's general
  effect typing, not a pattern list.
- (b) An equality proof, through the relational machine interface
  (`ink-relational-machine-v1`), between the journaled logical step (base
  semantics) and the plan's physical step for results, rows, caches and the
  event sequence.
- (c) For (3), it follows from (a) that the failure exits run before any effect.

### P2: direct outbox (journaled)

*Applicability.* Any change.

*Execution.* At entry, record `mark = outbox.len()` and `commit = version + 1`.
`emit` pushes `Event{commit, position: outbox.len() - mark, ..}` straight into
the outbox. Rollback truncates the outbox to `mark`. Commit only increments the
version.

*Evidence.*
- An invariant that `outbox[..mark]` is never written during the transaction.
- Truncation restores the pre-state.
- The coordinates equal the reference's staged enumeration.

*Not covered:* publication and acknowledgement. The outbox must not be read
during the transaction. The only readers today are host calls that need `&self`,
which the generated `&mut self` invocation excludes.

### P3: always-abort elimination (work skipping)

*Applicability.* A proof that every path through the body ends in `Err`. The plan
then evaluates only the error decision. In `examples/state-benchmark.lang`:

```text
change fail(key) { restock(key,7)?; restock(key,9)?; return Err(Error.Overflow); }
≡ if Items.contains(key) { Err(Overflow) } else { Err(Missing) }
```

A missing key aborts the first `restock` with `Missing`. A present key ends in
`Overflow`, either from an overflowing `restock` or from the final return. In both
cases the transaction aborts, so the effects are unobservable.

*Evidence.* Case analysis over the logical step (the existing general kernel
already supports Bool case splits), plus (3) from the abort semantics.

This is exactly what the handwritten Rust baseline does by hand
(`bench/state/baseline.rs`, op 3), and why that baseline does less work than Ink.

## Proposed package shape (sketch)

```json
{
  "schema": 1,
  "semantics": "ink-transaction-plan-v1",
  "core_sha256": "<exact checked executable core identity>",
  "action": "restock",
  "guard": ["version_below_max"],
  "steps": [
    {"lookup_mut": {"root": "Items", "key": "key", "slot": "s", "missing": "Error.Missing"}},
    {"let": {"name": "before", "value": "s.stock"}},
    {"checked": {"name": "next", "op": "add", "args": ["before", "amount"], "error": "Error.Overflow"}},
    {"replace": {"slot": "s", "value": {"Row": {"stock": "next"}}}},
    {"cache_delta": {"keep": "total_units", "remove": "before", "add": "next"}},
    {"emit": {"event": "updated", "value": {"Updated": {"key": "key", "before": "before", "after": "next"}}}},
    {"return": "Ok(())"}
  ],
  "machine": "<ink-relational-machine-v1 package relating base and plan>",
  "effects_certificate": "<P1 (a)>"
}
```

The step language is deliberately tiny, so that the Rust lowering of a step list
stays a trusted *straightforward* lowering, like `definition_native.rs`. All
selection is external, and cost evidence is a separate artefact, as AGENTS.md
requires.

## Measured value (Linux cloud VM, see report)

All variants produce byte-identical checksums, events, versions and state hashes.
The table is ns/op, median of 11 interleaved runs after a warmup run, with 2M
operations:

| Rows | Workload | Journaled today | P2 direct outbox | P1+P2 plan | Rust baseline | Rust with literal `fail` | Plan ÷ Rust baseline | Plan ÷ literal Rust |
|---:|---|---:|---:|---:|---:|---:|---:|---:|
| 64 | restock | 57.2 | 56.2 | 44.4 | 44.5 | 44.6 | 1.00× | 1.00× |
| 64 | mixed | 79.8 | 77.0 | 65.5 | 53.9 | 63.6 | 1.22× | 1.03× |
| 4096 | restock | 144.4 | 139.0 | 76.7 | 81.5 | 81.8 | 0.94× | 0.94× |
| 4096 | mixed | 163.7 | 159.7 | 137.7 | 87.7 | 121.6 | 1.57× | 1.13× |
| 262144 | mixed | 339.4 | 315.9 | 294.9 | 217.1 | 281.4 | 1.36× | 1.05× |

The headline result: on read-modify-write workloads, P1+P2 removes the whole
1.3–1.9× gap to the handwritten Rust baseline. The remaining gap on the mixed
workload comes from the journaled `fail` path, which P3 would remove.

## Open questions for the core

- **Source-action correspondence.** The machine interface relates database
  functions. Something must establish that the logical step *is* the action's
  meaning in the checked core. This is the roadmap's next source/state
  correspondence item, and P1–P3 depend on it.
- **Effect typing.** The core needs an effect typing (failure points and effects
  per statement) to check certificate (a) generally, rather than by matching
  shapes.
- **Fallback.** Plans need a fallback hook in the Rust backend:
  `invoke_view_*` tries the plan's guard, then the journaled base.

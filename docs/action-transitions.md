# Checked whole-action transitions

Ink can now admit a replacement of a complete stateful action in a restricted
executable subset. The core projects the actual sealed typed actions into fixed
logical transitions. The database supplies an alternative checked module and
proofs that its transitions are equal to the original transitions. No
transformation pattern or table-removal theorem is built into the compiler.

For example, a checked database law lets this action:

```ink
change erase(key:u64,fail:Bool)->Result<Unit,Error>
  writes(Rows) emits(seen) {
  Rows.remove(key);
  Rows.remove(key);
  emit seen(key);
  if fail { return Err(Error.Failed); }
  return Ok(());
}
```

become the same action with one removal. Its successful path has the same rows,
reply and event. Its failing path restores the original rows and discards the
staged event. The proof compares both paths over every initial logical state,
commit version and argument; observing a few successful executions is not
admission evidence.

The stable database theorem uses an abstract row sort. `Instance` interprets that
sort and checks that the real table and removal definitions are exactly its
instantiated definitions. One theorem can therefore apply to multiple roots
with different row types. The producer does no per-program induction. These are
individual database entries; the selection JSON transports a pinned, authenticated
view and checked proposal, rather than installing an algorithm into the core.

The current source projection supports u64-keyed tables whose values use u64,
Bool, Unit, enums, records, Option and Result; total word/Boolean expressions and
constructors; table get/contains; statement insert/replace/remove; local lets,
branches, ordered emits and returns. All action signatures and used operations
must lie in this domain. It currently rejects other numeric types, IDs, exact
integers, strings, lists, keep reads, pure/nested calls, Try and mutation values
used as expressions. Those features continue to execute through the baseline;
this projection does not certify their replacement. Proposed definitions and
continuations have explicit node, byte, depth and declaration limits. Kernel
proof limits and checking rules are unchanged.

A transition observes the reply, commit flag, version, every logical table root
and ordered staged events. Host failures preserve the original roots/version.
Commit exhaustion is checked only for successful changes. Queries retain their
original state and produce no committed events. Existing outbox contents are
unchanged or extended by fixed publication semantics; equal versions and staged
events produce equal published event positions. Source metadata, capabilities,
state/event schemas, helper functions and keeps must remain identical. Every
action requires a checked transition equality, including unmodified actions.

The logical table is an ordered key/row list. Reference and native inhabitants
have unique sorted keys. Removal deletes all matching keys in the logical model;
it agrees with map removal on that domain, and its stronger idempotence theorem
holds over every list. Equality over every logical state consequently covers
arbitrary future sequential action histories on valid snapshots. The sealed
`CheckedSelection` alone grants the original program's checkpoint namespace;
a raw modified module has a different identity.

To inspect and propose the example, build the CLI and run:

```sh
ink emit-action-model examples/action-transitions.ink -o original-model.json
# Write the alternative source with one removal, then:
ink emit-action-model selected.ink -o selected-model.json
ink emit-core selected.ink -o selected-core.json
python3 knowledge/producers/action_replacement.py \
  original-model.json selected-model.json selected-core.json \
  --knowledge knowledge -o proposal/selection.json
ink emit-core examples/action-transitions.ink -o original-core.json
ink check-selection original-core.json proposal/selection.json
ink execute examples/action-transitions.ink calls.json \
  --selection proposal/selection.json
```

The producer reads the pinned database law; `--snapshot` selects an explicit
snapshot. A composite view includes the actual source definitions and proof
closure. Frozen `--selection` replay needs no Python, planner, live database or
index. Incorrect explicit proposals fail; ordinary compilation retains the
baseline when no proposal is supplied. The producer's bounded search can refuse
a proposal it cannot prove. Expression-site and whole-action proposals are
currently separate selection forms; a whole-action proposal can compose several
database theorems and changes in one checked alternative module.

The trust boundary still includes the Rust source/primitive projection, fixed
reference semantics, host codecs, target emission, toolchains and device runtime.
This is not a proof of generated machine instructions or kernel soundness.
Resource exhaustion, allocation failure and concurrent execution are outside the
transition equality contract. The model does not yet admit arbitrary physical
representations, maintained views or their migrations. Legacy aggregate,
bounded-cache and layout admission remain migration debt. The full production
acceptance gates in PLAN.md remain active; editor support and schema evolution
remain excluded. There is no performance or universal-fastest claim from this
example.

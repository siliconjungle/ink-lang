# Immutable deployment state

An explicitly frozen state root contains typed, fixed rows in the checked source.
It is a restriction of the application's mutable capabilities, with a new source
identity. It is not an equality-preserving replacement of the original mutable API.
Other roots, ordinary application actions and remaining learning actions can stay
mutable. Freezing does not choose a reward, objective, optimizer or approximation.

## Core meaning and checking

`Program.frozen` maps root names to strictly ordered key/value rows. Empty bindings
are omitted from serialization, preserving existing program identities. A nonempty
binding selects `ink-executable-core-v14`. Bindings remain in the executable
program when proof-authoring metadata is removed.

The checker requires existing table roots and nominally typed values. It rejects
duplicate/unordered keys, write capabilities for frozen roots and roots still
declared trainable. Existing value and state invariants remain mandatory; initial
state obligations use the declared rows rather than empty tables. Bounds are
256 roots, 100,000 total rows, 100,000 JSON nodes and JSON depth 64, plus the
ordinary module, value and portable-codec limits.

The reference runtime initializes these rows and rejects any restoration that
changes them. Canonical typed table bytes distinguish signed zero, NaN payloads,
wide integers and nominal IDs. Frozen empty tables must remain empty. Commit
version, pending events and mutable state retain their normal meaning.

The source transition model includes the fixed initial state and equalities for
each frozen root. These facts derive from checked source bindings and the absence
of writers; producer-supplied hashes or hints cannot introduce them. Ordinary
equality checking can use them to establish constant lookups. This supplies a
foundation for database-authored specialization. It does not itself replace neural
evaluation, fold arithmetic or establish a performance improvement.

State emitters must explicitly support initialization and every restore boundary.
The legacy `CheckedActions::elaborate` entry rejects frozen source; updated callers
use `elaborate_with_frozen_roots`. This prevents an older emitter linked to the new
core from silently starting frozen tables empty. This API gate is implementation
discipline, not a proof of backend correctness.

`core/tests/frozen_state.rs` covers versioned transport, raw float bits, capability
rejection, fixed initial invariant obligations, nominal value invariants and a
source-derived constant-lookup equality with missing/wrong-premise rejection.
The full core suite remains independent of knowledge and backend checkouts.

The distribution exposes this restriction through
[`build-model --freeze` / `--freeze-roots`](trained-builds.md#explicitly-freeze-selected-degrees-of-freedom).
[Retained deployment, checks and limitations](../reports/frozen-deployment-2026-10-15/README.md)
include a resumed 244-parameter neural package and exact optimizer/control state.

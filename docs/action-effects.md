# Source-bound action effects

`ink emit-effects SOURCE -o EFFECTS.json` exports a bounded effect judgment from
Ink's checked ordered actions. `ink check-effects SOURCE EFFECTS.json` regenerates
and compares the artifact. The private witness binds the complete source identity,
ordered-action identity, semantics and all action/keep judgments. Supplied facts,
source hashes and database membership cannot forge it.

The judgment records reachable root reads/writes, events, keep dependencies,
transitive action calls and direct pure-function entries. Reading a keep grants
its transitive read-only dependencies; a write includes reading the previous row.
Declared but unreachable effects are not inferred as executed effects. Source
checking still requires valid types and declared permissions in dead code.

Each possible body exit carries two prefix flags: whether a write or event has
already occurred. Exits distinguish continuing evaluation, a returned value,
domain abort and recoverable host failure. Abstract values retain outer Bool,
Option and Result constructors. Returning Err from a query is an ordinary value;
propagating it with `?` exits the containing declaration. A query or
Result-valued keep catches its local domain exit as an ordinary Err value.
A change propagates it to rollback. A nested change's Err aborts even when discarded.
Return/abort/host exits suppress subsequent statements and argument evaluations.
Literal lazy branches skip unreachable operands. `ok_or` evaluates its fallback
eagerly. Read-only collection callbacks may run zero or many times; their access
and failure possibilities are conservatively included.

This is an overapproximation. It forgets keys, scalar comparisons, parameter/local
value correlations and nested constructor payloads. It retains neither event
payloads/order nor full histories; the typed action tree retains source order.
Host failures are conservatively possible before/after evaluated primitives.
The judgment covers declaration completion and body prefixes, before
commit/rollback. Query/keep local domain exits become returned Err values; host
failures continue to propagate. Successful bodies can
still fail at the separate commit boundary through version exhaustion. Allocation
or process/driver failure recovery is not promised.

The analysis shares a two-million-step work budget across module bodies and
cached dependencies, with depth 128 and the existing 16 MiB artifact limit.
Budget exhaustion returns an error, never a partial witness. Reference runtime
construction now derives this judgment; `Runtime::last_body_path` reports actual
prefix flags from the journal/staged outbox before rollback or publication.
That diagnostic is cleared for rejected ingress and is not snapshot state.

## Database composition laws

The canonical store adds eleven individual entries: outer value/exit/path
shapes, Boolean prefix combination, path sequencing and six theorems. They prove
Boolean/whole-path associativity, empty-prefix identity and suppression of a
suffix by return, abort or host failure. A smaller helper lemma makes replay fit
the existing proof budget; no kernel acceptance rule or cap was changed.

`effect_model::BoundEffects` checks the canonical dependency closure and exactly
matches those definitions to the fixed `Path::follow` semantics. It records the
source-bound effect artifact identity. Tests compare every pair in the finite
112-path domain and reject valid alternative sequencing definitions plus a fresh
authenticated false law. These are ordinary database definitions/equality proofs,
not optimisation-specific compiler patterns or package-name authority.

## Remaining verification

The source checker, elaboration, abstract analysis, model binding and executable
primitives remain trusted Rust. Composition laws do not prove the analysis sound
for every source program, connect a whole action to a logical state transition,
verify physical rollback, or certify the Rust/LLVM backend. Runtime diagnostics
and tests are validation evidence, not formal proof of those properties.

The witness cannot remove journalling, coalesce writes or install a stateful
replacement. Host failures after writes remain visible even for a body without
a domain error. Complete source/primitive correspondence, ordered observations
and all-future representation refinement are still the next gates. This phase
claims no execution speedup. See reports/action-effects-phase1.

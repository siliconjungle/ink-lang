# Executable change boundary

The reference runtime and generated Rust use the same dependency-free
`core/src/transaction.rs` primitives. Generated native and stateful Wasm code
embed that source verbatim. This freezes three existing behaviours:

- A failed change requires rollback, even at `version == u64::MAX`.
- A successful change commits at the next version, or requires rollback and
  reports commit exhaustion. The version never wraps.
- A nested change's error exits its caller immediately, including when the
  caller ignores or binds the returned value. Publication moves staged payloads
  in order and numbers this transaction's events from zero.

Queries can return an ordinary `Result::Err` without poisoning their caller.
Applying `?` inside a change aborts that change. A query or Result-valued keep
handles its own `?` locally and returns Err as an ordinary value; its caller may
choose to propagate it. The action body
runs before the boundary decides whether it may commit; prechecking exhaustion
would change the error precedence.

## Database binding

The independently authored `transaction-boundary` entries define a three-case
decision and its total `(version: U64, succeeded: Bool)` function. Four checked
laws cover domain-error precedence, exhaustion, the last valid commit and
commit under an explicit non-exhaustion premise. They are individual canonical
database entries, not a compiler rule list.

`transaction_model::BoundChange::bind` takes a checked module, a source change,
an authenticated canonical dependency closure and model identities. It checks
the closure's interfaces and mathematical proofs, then checks the actual
datatype and function bodies against fixed language semantics. Aliases and
content membership cannot substitute for those checks. The private witness
records the complete module identity and action name.

The generic `registry::CheckedBundle::first_order_context` returns a checked
first-order proof scope for correspondence clients. It uses the same interface,
dependency and proof admission as normal registry verification. Mixed domains
must be projected externally; the existing active-context resource caps remain.

Six fresh authenticated, mathematically well-typed alternative protocols are
rejected by binding: unconditional rollback, unchecked commit, an increment of
two, an early exhaustion threshold, exhaustion preceding domain errors and
reversed success. A rehashed false theorem rejects in mathematical admission.
The ordinary checked definition therefore establishes neither source relevance
nor implementation authority by itself.

## Trust boundary and remaining work

The Rust primitives and the correspondence checker remain trusted, reviewed
implementations. Shared source removes independent spellings of the protocol;
it is not a formal proof of Rust, its compiler or machine code. The laws prove
the bound decision definition in Ink's existing logic. They do not prove the
execution of an action body, physical map/cache restoration, event payloads,
outbox append, snapshot codecs, host failures, concurrency or durability.

The witness cannot install a replacement, remove a journal or enable a
transaction shortcut. Source actions still run the existing journalled base;
queries, host failures and rollback storage retain their existing implementation.
The P1/P2/P3 prototypes remain proposals with no compiler recognisers.

The next correspondence gate needs a general typed action representation with
ordered effects, branching, calls and abrupt error exits. Its executable meaning
must connect actual reads, writes, tentative queries and staged payloads to the
database transition model. Complete restoration and publication proofs can then
support checked transaction/representation replacements. A matching AST or a
valid theorem about an unrelated interpreter cannot supply that connection.

This change makes no performance claim. It preserves the base execution work;
profitability still needs separate matched measurements after an optimisation
has actual application evidence.

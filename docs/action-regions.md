# Database equality in typed actions

The general equality checker can replace total pure expression regions inside
source-bound actions and keeps. It derives the regions from sealed `CheckedActions`
nodes, not a producer's description of the source. The existing database laws,
proposal format and external query engine are unchanged.

`optimisation::subject` exposes each maximal supported region under an address
such as `@action/put/7` or `@keep/total/12`. These are proposal addresses, not
generated functions. The node number belongs to the exact input core hash.
Unsupported expressions stay in the base program; unavailable projections are
reported in `Subject.unavailable`. An empty checked selection preserves the input
even when projection or search cannot complete.

Locals use resolved slot identities. Callback binders become bound variables.
Pure branch conditions supply facts only inside that lexical branch; a callback
that shadows a source name has a different slot. State reads, keep reads, table
operations, queries, changes and `?` cannot become pure facts or pure operations
by spelling their names like a local. The replacement may use only the original
region's free values, including under callbacks. Reification avoids capture and
must re-elaborate to the checked semantic term. Rebuilding the source changes
only expressions at admitted node addresses, then checks the entire module again.

Projection, copied facts and proof checking consume existing work/depth budgets.
This does not widen the total-value calculus: exact-Int arithmetic and constructors
without a correspondence are left unchanged. Some database replacements produce
source expressions the action grammar does not yet support; those candidates
fail checking and search can retain the base program.

## Checkpoint identity

A `CheckedSelection` retains its private original checked module. Only this
witness can obtain `snapshot::selected_layout`, after exact schema, root and
event agreement. `Runtime::new_selected`, `restore_selected` and
`restore_portable_selected` execute selected code with the original program's
checkpoint identity. JSON and portable formats are unchanged. A plain selected
`Program` has its own identity and cannot restore the original program's state.
An unrelated source program or corrupted snapshot still fails restoration.

This is a proof-authorised choice of execution for one source program. It grants
no schema evolution and no authority to later independent code changes. Backend
selection APIs must consume the same witness rather than accept a caller-supplied
program hash.

## Remaining boundary

This contextual bridge relies on the fixed total-value semantics and their trusted
source/primitive correspondence. It proves expression equality, not a whole-action
logical interpreter or universal physical representation refinement. It cannot
replace transaction instructions, reorder events, change storage declarations or
certify generated machine code. Those production gates and migration of legacy
aggregate/layout admission remain open in PLAN.md.

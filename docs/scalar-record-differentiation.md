# Scalar records in generated differentiation

The JavaScript lowering can pass privately constructed immutable records to
large helpers as scalar slots. This extends local record storage across a call
without expanding its body on the caller's emitter stack. Finite literal slots
are embedded in the private helper; dynamic slots remain invocation parameters.
Original public functions, types, capture policies and checked source identities
remain available. No application or differentiation name identifies an opportunity.

Straight-line scopes share identical fixed F32/F64 computations on the same
immutable carriers. This exposes repeated basis-seed and inactive-lane work in
forward differentiation. Every distinct multiplication, addition, rounding and
primal still executes in its original grouping. In particular, `0 * x` remains
an operation: infinity, NaN and signed zero forbid treating it as an unconditional
zero. This does not replace forward differentiation with reverse differentiation,
factor a derivative, or establish an algebraic equality.

Only evaluated private constructors supply record slots. Borrowed public getters
retain their original reads, normalization, demand and exceptions. Captured
stateful inputs may share immutable scalar field reads after ingress. Such a
carrier may contain exact NaN tags; it is not a finite-number fact. Whole-record
reads capture mutable loop and merge slots before nested constructors retain
them. Arguments and unused fields still execute once, in source order. Outlined
helpers exclude owned inputs/results and recursive function groups; splitting a
record grants no ownership of its children. Public results remain detached.

The optional lane admits at most 32 helper shapes, 512 shape nodes per call,
eight nested record levels and 16,384 aggregate body nodes. Each body has a
65,536-byte limit and all helper declarations share 262,144 bytes, including
reserved ordinary reconstruction wrappers. Record metadata has independent
entry/byte bounds. Exhaustion keeps the ordinary call or emits its reserved
wrapper. Failed attempts restore callbacks, equality helpers, slots, scalar facts,
names and optional budgets. Destination and prepared calls register helpers
before final helper emission. Existing inline depth and source bounds remain.

Algorithms, algebraic derivative simplifications, range specializations and
proof-backed selection remain knowledge/planner work. These calling conventions
and shared immutable bindings are literal target machinery, not rewrite evidence.

The [conformance proof](../bench/functionality/scalar-records/README.md) uses a
new twelve-coordinate objective, F32/F64 exceptional values, borrowed getters,
prepared calls, recursive histories, and oversized optional-body fallback. It
also replays exact state/snapshot controls and an eligible hardware GPU dispatch.
Application timing evidence is retained separately with its exact private inputs;
conformance alone establishes no speed or whole-game frame-rate claim.

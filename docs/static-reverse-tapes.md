# Whole static reverse tapes

The existing source reverse interfaces can compile a complete bounded scalar
graph instead of constructing and dispatching an owned tape at runtime. This
applies to F32/F64 scalar and plain-record parameters, scalar/record context,
nonrecursive named helpers, lexical bindings, record construction/projection,
addition, subtraction, multiplication, explicit division, negation, square root
and literal `repeat` loops of at most 32 iterations. Dynamic lists, data-dependent
control flow, unsupported operations and exhausted optional resources retain the
existing owned-tape elaboration. No application or library name identifies a graph.

The compiler evaluates strict source operands in order. Already evaluated immutable
scalar operands can share the result of the identical fixed operation across helper
and loop boundaries. There is no reassociation, zero-product elimination, precision
change or substitution of reverse for forward differentiation. Every active source
operation retains its separate logical tape node even when its primal is shared.
Thus duplicate operations still consume capacity and have separate reverse edges.

Gradient and linearized requests for the same objective and piecewise mode share
one generated value/gradient kernel. Their ordinary Result projection preserves
each interface; code sharing retains no invocation data.

The reverse schedule follows descending logical node order and left-before-right
edge order, including repeated input edges. Each node snapshots its incoming
cotangent before updating either edge. Every update uses the latest value of its
destination, including the first update when both edges target the same input.
The authored `stopZero` policy remains a lazy node-level gate. With propagation
enabled, dead and inactive edges retain their strict derivative arithmetic; an
unused multiply can still propagate a NaN into a parameter's cotangent. Capacity
failure still returns the existing error after primal evaluation, while the
one-million-node hard-cap error precedes objective evaluation.

Scalar values use single-assignment bindings. Liveness determines which primals
and cotangents cross each 24-binding block. Ordinary typed continuation calls pass
only those live values as parameters; they construct no intermediate tape or
frame records. Dead intermediate storage is retired without erasing strict source
work. There is no retained scratch pool or stale primal cache. The authored reverse
interface keeps its existing ABI; elaborated helper signatures are ordinary checked
functions. Static-only
requests omit the unused bundled tape declarations. Mixed static/dynamic modules
retain the dynamic implementation as needed.

Optional planning has independent limits: 8,192 source/shape visits and depth 32
per request, 256 logical nodes, 768 bindings per phase, 192 live continuation parameters, and
32,768 generated expression nodes, parameters and new record fields across one precision's
expansion. Failed scheduling restores declarations and fresh names. These limits
bound compiler work and output; they do not change the authored dynamic tape's
capacity or raise ordinary target/source limits.

This remains trusted source-AD implementation machinery. Normal checking and
cross-target tests do not prove the transform or backend correct. Algebraic laws,
alternative algorithms and physical representation selection remain knowledge
and planner work. Device reverse training and arbitrary whole-application
differentiation remain outside this admitted domain.

See the [complete-update study](../bench/functionality/static-reverse/README.md),
the standalone `static_reverse` tests and the required `source_reverse` learning
histories. The tests compare logical capacity, exact scalar bits, exceptional
values, duplicate primals/edges, source transport, complete events and snapshots.

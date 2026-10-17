# Stable whole-action correspondence

`ink emit-action-model SOURCE --projection structural-v2 -o MODEL.json`
explicitly selects `ink-action-transition-v2`. The default remains the historical
projection, including its serialized identities. Replacement packages using the
new projection carry `"projection":"structural-v2"`; unknown modes reject.

The new projection gives local binders canonical lexical names and imports each
declaration's actual term/type dependencies. Previously a helper's identity could
include unrelated types discovered while projecting an earlier action. Changing
that action then renamed a later, unchanged transition. Minimal imports and
canonical binders let those transitions share their existing definitions.

This changes the representation of the source correspondence, not executable
source meaning. The replacement checker re-derives both complete models from
checked source in the requested mode. It binds their reachable definitions,
interfaces and immutable initial-state premises, then checks every action proof.
The exported `pure_functions` map identifies projected source helpers for
authoring; its contents grant no rewrite authority. Cross-mode or substituted
source definitions cannot replace this replay.

Knowledge and checked-context imports now use iterative topological traversal.
A chain of small checked equations need not fit the former 64-edge dependency
height. Cycles, conflicting identities, missing dependencies and membership
failures still reject. The existing 8,192-entry and 128 MB view limits bound the
whole graph; individual proof work, term depth and definition checks still apply.
Import failure leaves the previous checked context intact.

Conversion search can align adjacent calls of the same recursive function before
unfolding their remaining computation together. It performs ordinary checked
definition reduction and compares every argument within the existing speculative
work/depth allowance. It does not infer an algebraic equation or accept a cached
proof verdict.

Regression coverage includes unchanged-transition identities, mode/source
substitution, lexical float captures, event order, failed-action rollback,
exhausted versions, long theorem dependencies and false equations with authentic
content hashes. These are finite implementation checks, not compiler correctness
or evidence of runtime speed. Full-network specialization remains a separate
complete-plan admission and execution milestone.

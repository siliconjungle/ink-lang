# Local bindings in compiled JavaScript actions

The JavaScript backend emits consecutive expression bindings in one lexical
block. Leading bindings, including bindings in the first strict operand of a
binary expression, can become local statements in the enclosing action body.
Other operands and lazy branches keep their bindings at their original positions.
This removes nested function wrappers without changing Ink syntax or source
meaning.

Every initializer still executes once in order, including unused initializers.
Fresh target names preserve shadowing and snapshots of earlier values. Branches
remain lazy; nested failures still abort the transaction and roll back state and
events. Mutable inputs receive no new uniqueness or retained-cache assumptions.
F32 state values keep their exact bit carriers and arithmetic rounding points.
Temporary AST addresses only connect an emitted first operand with its already
rendered expression; they are never transported or accepted as proof evidence.

A new independent reference history exercises nested changes, lexical shadowing,
old-value snapshots, first-operand placement, unvisited Boolean branches, failures,
events and portable checkpoints. It compares 72 cases through both ordinary and
prepared calls, including exact F64 payloads and U64 result words. Existing
backend and frozen-program histories cover F32 and the compiled deployment path.

This is literal code-generation support. A database proposal still needs complete
source equality proofs to select a different program. The
[frozen operation-sequence example](frozen-structural-specialization.md#compile-a-frozen-program-while-weights-remain-trainable)
exposes why both layers matter: unrolling alone initially regressed; placing its
bindings directly in the action made the complete serving path faster in its
paired study. That does not establish performance parity for general neural
graphs or the three upstream libraries.

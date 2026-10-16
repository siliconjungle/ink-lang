# Structural conversion of checked terms

The first-order equality checker can compare shared term structure before eagerly
computing whole descendants. This supports ordinary conversion proofs for frozen
programs whose control structure is known while numeric weights remain live.
It adds no syntax, primitive, proof variant, axiom or source-specific recognizer.

The strategy uses congruence for matching constructors, functions, operators,
conditionals and matches. Corresponding match binders receive fresh common names
that avoid every free and bound name on both sides. Calls unfold only checked
total definitions. Recursive calls still require an exposed constructor in their
declared decreasing argument. Scalar computation reuses the existing meanings.

Before substitution can duplicate a function argument, the strategy can remove
its known outer control. For example, a frozen operation selector can choose an
affine arm before the next traversal step refers to that result in several arms.
Unknown arithmetic predicates stay symbolic. This changes a computation strategy
inside the proof checker; it does not reorder source execution or floating-point
arithmetic, skip runtime validations or authorize a learned replacement.

The attempt consumes at most 32,768 work steps and at most a quarter of the
remaining ordinary proof budget. It has 4,096 comparison opportunities and a
comparison-depth bound of 64. Existing typing, substitution, normalization,
termination, byte, definition and depth bounds remain active. All attempt work
is charged even on failure. Exhausting this attempt retains the existing
conversion strategies with their remaining budget. No verdict crosses contexts.

Kernel tests cover recursive ordered F32 accumulation, frozen dispatch with
symbolic weights, capture avoidance, dynamic arms, incorrect outputs, IEEE NaN
comparisons and resource/context boundaries. The distribution's frozen-program
test replays complete action proofs and compares updated weights, results,
errors, events and exact checkpoints on compiled targets. These are tests of
trusted implementation code, not a formal proof of the checker or lowerers.

Large frozen lists still hit canonical proof-value depth limits, and long
straight-line action bodies can hit continuation limits. Scalable graph/tape
specialization still needs checked sharing or factored proofs; raising existing
caps is not the solution. Profitability remains a separate measured obligation.

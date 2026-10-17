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

A direct gated reduction may now spend up to 16,384 of those shared work steps
on substitution and lexical alignment, rather than stopping at 4,096. A valid
larger owned helper from the authored network needs that room before an exact
body comparison is possible. The complete attempt remains bounded at 32,768;
the ordinary one-million-step proof allowance and all depth bounds are unchanged.
The exact source-independent equation replays in `core/tests/direct_delta.rs`,
alongside rejection of an unrelated input and the prior eight-operation budget
regression. This changes search allocation within conversion, not equality
semantics or runtime execution.

Capture-avoiding substitution now collects source and replacement names once
per borrowed transform, when its first binder needs them. Fresh names remain
reserved for the rest of that walk. It no longer rescans a large captured
expression at every nested match. Inserted terms are still copied and charged;
shadowing, simultaneous substitution, lexical capture avoidance and all existing
work/depth limits remain in force. No summary or proof verdict survives the
call. The large-capture and shadowing regressions exercise those contracts.
Scoped environments also borrow their keys and replacement terms, rather than
deep-cloning captures at every binder. Environment metadata consumes work, and
terms are copied only when inserted into the result. This keeps the reduction
in charged name-analysis work consistent with the temporary storage actually
needed by the transform.

Kernel tests cover recursive ordered F32 accumulation, frozen dispatch with
symbolic weights, capture avoidance, dynamic arms, incorrect outputs, IEEE NaN
comparisons and resource/context boundaries. The distribution's frozen-program
test replays complete action proofs and compares updated weights, results,
errors, events and exact checkpoints on compiled targets. These are tests of
trusted implementation code, not a formal proof of the checker or lowerers.

[Shared frozen literals](frozen-literal-sharing.md) now keep long list/table
spines in transparent definitions, and exhaustive case proofs retain their exact
checked conclusion without expanding all data again. Bounded case-normalization
hints can retain their typed call. Long straight-line action bodies can still hit
continuation limits. Scalable graph/tape specialization needs further checked
sharing and factored producer proofs; a larger allowance alone establishes no
equivalence.
Profitability remains a separate measured obligation.

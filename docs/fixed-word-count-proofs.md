# Fixed-word count proofs

`fixed-counts-v5` extends the explicit semantic bit-vector proof interface with
fixed meanings for the existing `popcount`, `leading_zeros` and `trailing_zeros`
primitives. Inputs are `u32`, `i32` or `u64`; the result remains `u32`. Signed
inputs count their 32 stored bits. Leading/trailing zero counts of zero are the
input width. The language primitives and executable-core format are unchanged.

The checker reconstructs ordinary Boolean circuits: a balanced sum of bits for
population counts, and a bounded priority encoder for leading/trailing zeros.
Existing hinted RUP verification grants equality. The compiler has no count
rewrite catalogue, solver, theorem whitelist, profile premise or larger proof
budget. Earlier proof modes retain opaque nonliteral count observations; the
new interpretation requires an explicit version. Non-count circuit identities
remain unchanged in the retained compatibility tests. Binary64 remains outside
the source bit-vector proof domain.

The independent knowledge package supplies eighteen equations across the three
carriers: count-based zero tests and counts of a constructed single-bit word.
Shift counts wrap modulo the input width. A constant-result replacement binds
the original count operand first, retaining its evaluation exactly once. The
frozen library index only proposes equations; applications and their ordinary
proofs still replay. Cost evidence ranks checked plans separately. Unsupported
or unmeasured target/workload contexts retain their existing selection behavior.

Count reification also preserves the checked operand type when an untyped
literal or nested expression would infer a different width. This repairs a
normalization defect: `leading_zeros` of a typed `u32` zero is 32, while a bare
literal passed to the overloaded primitive defaults to `u64`. Typed hygienic
bindings preserve source evaluation order and lexical identities; malformed
count arity rejects. The retained old/new regression demonstrates rejection of
the previously admitted false equality with 64. Old certificates relying on
that defect are invalid. No cached hash or old acceptance bypasses replay.

The V8 source starting point is its [fixed-width unary count folding](https://github.com/v8/v8/blob/c4e049d3cbda775e2c3af9410f6e18b18388d68b/src/compiler/turboshaft/machine-optimization-reducer.h#L484).
Ink's composed count equations are independently proved generalizations, not a
claim that V8 implements these exact source rewrites. See the retained
[count validation and measurements](../bench/v8-learning/counts/README.md).
